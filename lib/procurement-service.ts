'use server'

import prisma from '@/lib/prisma'
import { RequisitionStatus } from '@/generated/prisma/client'
import { revalidatePath } from 'next/cache'

export type ProcurementDashboardStats = {
  totalRequisitions: number
  submittedCount: number
  inProcurementCount: number
  fulfilledCount: number
  activeProjectsCount: number
  recentRequisitions: Array<{
    id: string
    requisitionNo: string
    status: RequisitionStatus
    notes: string | null
    createdAt: Date
    updatedAt: Date
    lead: {
      id: string
      name: string
      phone: string | null
      location: string | null
    }
    createdBy: {
      fullName: string | null
    }
    itemCount: number
  }>
}

export async function getProcurementDashboardStats(): Promise<ProcurementDashboardStats> {
  try {
    const [
      totalRequisitions,
      submittedCount,
      inProcurementCount,
      fulfilledCount,
      recentRaw,
      leadsWithProcurement,
    ] = await Promise.all([
      prisma.materialRequisition.count(),
      prisma.materialRequisition.count({ where: { status: 'SUBMITTED' } }),
      prisma.materialRequisition.count({ where: { status: 'IN_PROCUREMENT' } }),
      prisma.materialRequisition.count({ where: { status: 'FULFILLED' } }),
      prisma.materialRequisition.findMany({
        take: 8,
        orderBy: { updatedAt: 'desc' },
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              phone: true,
              location: true,
            },
          },
          createdBy: {
            select: {
              fullName: true,
            },
          },
          _count: {
            select: { items: true },
          },
        },
      }),
      prisma.materialRequisition.findMany({
        where: {
          status: {
            in: ['IN_PROCUREMENT', 'FULFILLED'],
          },
        },
        select: {
          leadId: true,
        },
        distinct: ['leadId'],
      }),
    ])

    const recentRequisitions = recentRaw.map((req) => ({
      id: req.id,
      requisitionNo: req.requisitionNo,
      status: req.status,
      notes: req.notes,
      createdAt: req.createdAt,
      updatedAt: req.updatedAt,
      lead: req.lead,
      createdBy: req.createdBy,
      itemCount: req._count.items,
    }))

    return {
      totalRequisitions,
      submittedCount,
      inProcurementCount,
      fulfilledCount,
      activeProjectsCount: leadsWithProcurement.length,
      recentRequisitions,
    }
  } catch (error) {
    console.error('Failed to get procurement dashboard stats:', error)
    return {
      totalRequisitions: 0,
      submittedCount: 0,
      inProcurementCount: 0,
      fulfilledCount: 0,
      activeProjectsCount: 0,
      recentRequisitions: [],
    }
  }
}

export type ProcurementRequisitionItem = {
  id: string
  requisitionNo: string
  status: RequisitionStatus
  notes: string | null
  createdAt: Date
  updatedAt: Date
  lead: {
    id: string
    name: string
    phone: string | null
    location: string | null
    stage: string
  }
  createdBy: {
    fullName: string | null
  }
  items: Array<{
    id: string
    workCategory: string
    materialName: string
    specifications: string | null
    netQuantity: number
    wastagePercent: number
    finalQuantity: number
    unit: string
    productionPhase: string | null
    remarks: string | null
  }>
}

export async function getProcurementRequisitions(params?: {
  status?: string
  search?: string
}): Promise<ProcurementRequisitionItem[]> {
  try {
    const statusFilter =
      params?.status && params.status !== 'ALL'
        ? (params.status as RequisitionStatus)
        : params?.status === 'ALL'
        ? undefined
        : 'FULFILLED' // Default to FULFILLED as requested!

    const requisitions = await prisma.materialRequisition.findMany({
      where: {
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(params?.search
          ? {
              OR: [
                { requisitionNo: { contains: params.search, mode: 'insensitive' } },
                { lead: { name: { contains: params.search, mode: 'insensitive' } } },
                { notes: { contains: params.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
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
          select: {
            fullName: true,
          },
        },
        items: {
          orderBy: { workCategory: 'asc' },
          select: {
            id: true,
            workCategory: true,
            materialName: true,
            specifications: true,
            netQuantity: true,
            wastagePercent: true,
            finalQuantity: true,
            unit: true,
            productionPhase: true,
            remarks: true,
          },
        },
      },
    })

    return requisitions
  } catch (error) {
    console.error('Failed to get procurement requisitions:', error)
    return []
  }
}

export async function getCompletedRequisitions(search?: string): Promise<ProcurementRequisitionItem[]> {
  return getProcurementRequisitions({ status: 'FULFILLED', search })
}

export async function updateRequisitionStatus(requisitionId: string, status: RequisitionStatus) {
  try {
    const updated = await prisma.materialRequisition.update({
      where: { id: requisitionId },
      data: { status },
    })

    revalidatePath('/procurement/dashboard')
    revalidatePath('/procurement/requisitions')
    return { success: true, data: updated }
  } catch (error) {
    console.error('Failed to update requisition status:', error)
    return { success: false, error: 'Could not update requisition status.' }
  }
}
