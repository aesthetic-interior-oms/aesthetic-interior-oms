'use server'

import prisma from '@/lib/prisma'
import { RequisitionStatus } from '@/generated/prisma/client'
import { auth } from '@clerk/nextjs/server'

export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { userId } = await auth()
    if (!userId) return null
    const dbUser = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    })
    return dbUser?.id || null
  } catch {
    return null
  }
}

// -------------------------------------------------------------
// DASHBOARD STATS
// -------------------------------------------------------------

export type ProcurementDashboardStats = {
  totalRequisitions: number
  submittedCount: number
  inProcurementCount: number
  fulfilledCount: number
  rejectedCount: number
  cancelledCount: number
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
      rejectedCount,
      cancelledCount,
      recentRaw,
      leadsWithProcurement,
    ] = await Promise.all([
      prisma.materialRequisition.count(),
      prisma.materialRequisition.count({ where: { status: 'SUBMITTED' } }),
      prisma.materialRequisition.count({ where: { status: 'IN_PROCUREMENT' } }),
      prisma.materialRequisition.count({ where: { status: 'FULFILLED' } }),
      prisma.materialRequisition.count({ where: { status: 'REJECTED' } }),
      prisma.materialRequisition.count({ where: { status: 'CANCELLED' } }),
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
      rejectedCount,
      cancelledCount,
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
      rejectedCount: 0,
      cancelledCount: 0,
      activeProjectsCount: 0,
      recentRequisitions: [],
    }
  }
}
