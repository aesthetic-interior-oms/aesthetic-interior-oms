'use server'

import prisma from '@/lib/prisma'
import {
  RequisitionStatus,
  PurchaseStockSource,
  PurchasePaymentStatus,
  PurchaseDeliveryStatus,
  PurchaseDocumentType,
} from '@/generated/prisma/client'
import { revalidatePath } from 'next/cache'
import { auth } from '@clerk/nextjs/server'

async function getCurrentUserId(): Promise<string | null> {
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
  totalSpend: number
  totalPaid: number
  totalOutstanding: number
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
    totalCost: number
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
      costAggregates,
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
          items: {
            select: {
              purchaseLines: {
                select: {
                  totalPurchaseCost: true,
                },
              },
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
      prisma.purchaseLine.aggregate({
        _sum: {
          totalPurchaseCost: true,
          paidAmount: true,
        },
      }),
    ])

    const totalSpend = costAggregates._sum.totalPurchaseCost || 0
    const totalPaid = costAggregates._sum.paidAmount || 0
    const totalOutstanding = Math.max(0, totalSpend - totalPaid)

    const recentRequisitions = recentRaw.map((req) => {
      const totalCost = req.items.reduce((sum, item) => {
        const itemCost = item.purchaseLines.reduce((pSum, pl) => pSum + (pl.totalPurchaseCost || 0), 0)
        return sum + itemCost
      }, 0)

      return {
        id: req.id,
        requisitionNo: req.requisitionNo,
        status: req.status,
        notes: req.notes,
        createdAt: req.createdAt,
        updatedAt: req.updatedAt,
        lead: req.lead,
        createdBy: req.createdBy,
        itemCount: req._count.items,
        totalCost,
      }
    })

    return {
      totalRequisitions,
      submittedCount,
      inProcurementCount,
      fulfilledCount,
      rejectedCount,
      cancelledCount,
      activeProjectsCount: leadsWithProcurement.length,
      totalSpend,
      totalPaid,
      totalOutstanding,
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
      totalSpend: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      recentRequisitions: [],
    }
  }
}

// -------------------------------------------------------------
// REQUISITION LIST
// -------------------------------------------------------------

export type ProcurementRequisitionItem = {
  id: string
  requisitionNo: string
  status: RequisitionStatus
  notes: string | null
  rejectionReason: string | null
  cancellationReason: string | null
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
  itemCount: number
  totalCost: number
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
    purchaseLinesCount: number
    deliveredQuantity: number
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
        : 'FULFILLED'

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
            purchaseLines: {
              select: {
                totalPurchaseCost: true,
                quantityDelivered: true,
              },
            },
          },
        },
      },
    })

    return requisitions.map((req) => {
      let reqTotalCost = 0
      const items = req.items.map((item) => {
        const itemDelivered = item.purchaseLines.reduce((s, p) => s + (p.quantityDelivered || 0), 0)
        const itemCost = item.purchaseLines.reduce((s, p) => s + (p.totalPurchaseCost || 0), 0)
        reqTotalCost += itemCost

        return {
          id: item.id,
          workCategory: item.workCategory,
          materialName: item.materialName,
          specifications: item.specifications,
          netQuantity: item.netQuantity,
          wastagePercent: item.wastagePercent,
          finalQuantity: item.finalQuantity,
          unit: item.unit,
          productionPhase: item.productionPhase,
          remarks: item.remarks,
          purchaseLinesCount: item.purchaseLines.length,
          deliveredQuantity: itemDelivered,
        }
      })

      return {
        id: req.id,
        requisitionNo: req.requisitionNo,
        status: req.status,
        notes: req.notes,
        rejectionReason: req.rejectionReason,
        cancellationReason: req.cancellationReason,
        createdAt: req.createdAt,
        updatedAt: req.updatedAt,
        lead: req.lead,
        createdBy: req.createdBy,
        itemCount: items.length,
        totalCost: reqTotalCost,
        items,
      }
    })
  } catch (error) {
    console.error('Failed to get procurement requisitions:', error)
    return []
  }
}

export async function getCompletedRequisitions(search?: string): Promise<ProcurementRequisitionItem[]> {
  return getProcurementRequisitions({ status: 'FULFILLED', search })
}

// -------------------------------------------------------------
// REQUISITION DETAIL WITH FULL PURCHASING WORKFLOW
// -------------------------------------------------------------

export type PurchaseDocumentData = {
  id: string
  documentType: PurchaseDocumentType
  fileUrl: string
  fileName: string | null
  fileSize: number | null
  notes: string | null
  uploadedAt: Date
  uploadedBy?: { fullName: string | null } | null
}

export type DeliveryBatchData = {
  id: string
  quantityDelivered: number
  deliveredAt: Date
  notes: string | null
  receivedBy?: { fullName: string | null } | null
}

export type DeliveryDateLogData = {
  id: string
  promisedDate: Date
  reason: string | null
  loggedAt: Date
  loggedBy?: { fullName: string | null } | null
}

export type PurchaseLineData = {
  id: string
  requisitionItemId: string
  stockSource: PurchaseStockSource
  supplierName: string | null
  supplierPhone: string | null
  supplierEmail: string | null
  quantityOrdered: number
  quantityDelivered: number
  quotedUnitPrice: number | null
  negotiatedUnitPrice: number | null
  materialTotal: number
  transportCost: number
  loadingCost: number
  taxAmount: number
  otherCosts: number
  totalPurchaseCost: number
  paymentStatus: PurchasePaymentStatus
  paidAmount: number
  deliveryStatus: PurchaseDeliveryStatus
  returnReason: string | null
  replacementNote: string | null
  dateOrdered: Date | null
  expectedDeliveryDate: Date | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
  deliveryBatches: DeliveryBatchData[]
  deliveryDateLogs: DeliveryDateLogData[]
  documents: PurchaseDocumentData[]
}

export type DetailedRequisitionItem = {
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
  purchaseLines: PurchaseLineData[]
}

export type RequisitionAmendmentData = {
  id: string
  changeDescription: string
  requestedAt: Date
  status: string
  requestedBy: { fullName: string | null }
  acknowledgedBy: { fullName: string | null } | null
  acknowledgedAt: Date | null
}

export type ProcurementRequisitionDetail = {
  id: string
  requisitionNo: string
  status: RequisitionStatus
  notes: string | null
  rejectionReason: string | null
  cancellationReason: string | null
  createdAt: Date
  updatedAt: Date
  lead: {
    id: string
    name: string
    phone: string | null
    email: string | null
    location: string | null
    stage: string
  }
  createdBy: {
    fullName: string | null
    email: string | null
  }
  items: DetailedRequisitionItem[]
  amendments: RequisitionAmendmentData[]
  totalEstimatedCost: number
  totalPaidAmount: number
  allDelivered: boolean
}

export async function getProcurementRequisitionDetail(
  requisitionId: string
): Promise<ProcurementRequisitionDetail | null> {
  try {
    const req = await prisma.materialRequisition.findUnique({
      where: { id: requisitionId },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            location: true,
            stage: true,
          },
        },
        createdBy: {
          select: {
            fullName: true,
            email: true,
          },
        },
        amendments: {
          orderBy: { requestedAt: 'desc' },
          include: {
            requestedBy: { select: { fullName: true } },
            acknowledgedBy: { select: { fullName: true } },
          },
        },
        items: {
          orderBy: { workCategory: 'asc' },
          include: {
            purchaseLines: {
              orderBy: { createdAt: 'asc' },
              include: {
                deliveryBatches: {
                  orderBy: { deliveredAt: 'desc' },
                  include: {
                    receivedBy: { select: { fullName: true } },
                  },
                },
                deliveryDateLogs: {
                  orderBy: { loggedAt: 'desc' },
                  include: {
                    loggedBy: { select: { fullName: true } },
                  },
                },
                documents: {
                  orderBy: { uploadedAt: 'desc' },
                  include: {
                    uploadedBy: { select: { fullName: true } },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!req) return null

    let totalEstimatedCost = 0
    let totalPaidAmount = 0
    let allDelivered = req.items.length > 0

    const items: DetailedRequisitionItem[] = req.items.map((item) => {
      let itemDeliveredQty = 0

      const purchaseLines: PurchaseLineData[] = item.purchaseLines.map((pl) => {
        totalEstimatedCost += pl.totalPurchaseCost
        totalPaidAmount += pl.paidAmount
        itemDeliveredQty += pl.quantityDelivered

        return {
          id: pl.id,
          requisitionItemId: pl.requisitionItemId,
          stockSource: pl.stockSource,
          supplierName: pl.supplierName,
          supplierPhone: pl.supplierPhone,
          supplierEmail: pl.supplierEmail,
          quantityOrdered: pl.quantityOrdered,
          quantityDelivered: pl.quantityDelivered,
          quotedUnitPrice: pl.quotedUnitPrice,
          negotiatedUnitPrice: pl.negotiatedUnitPrice,
          materialTotal: pl.materialTotal,
          transportCost: pl.transportCost,
          loadingCost: pl.loadingCost,
          taxAmount: pl.taxAmount,
          otherCosts: pl.otherCosts,
          totalPurchaseCost: pl.totalPurchaseCost,
          paymentStatus: pl.paymentStatus,
          paidAmount: pl.paidAmount,
          deliveryStatus: pl.deliveryStatus,
          returnReason: pl.returnReason,
          replacementNote: pl.replacementNote,
          dateOrdered: pl.dateOrdered,
          expectedDeliveryDate: pl.expectedDeliveryDate,
          notes: pl.notes,
          createdAt: pl.createdAt,
          updatedAt: pl.updatedAt,
          deliveryBatches: pl.deliveryBatches.map((b) => ({
            id: b.id,
            quantityDelivered: b.quantityDelivered,
            deliveredAt: b.deliveredAt,
            notes: b.notes,
            receivedBy: b.receivedBy,
          })),
          deliveryDateLogs: pl.deliveryDateLogs.map((l) => ({
            id: l.id,
            promisedDate: l.promisedDate,
            reason: l.reason,
            loggedAt: l.loggedAt,
            loggedBy: l.loggedBy,
          })),
          documents: pl.documents.map((d) => ({
            id: d.id,
            documentType: d.documentType,
            fileUrl: d.fileUrl,
            fileName: d.fileName,
            fileSize: d.fileSize,
            notes: d.notes,
            uploadedAt: d.uploadedAt,
            uploadedBy: d.uploadedBy,
          })),
        }
      })

      if (item.purchaseLines.length === 0 || itemDeliveredQty < item.finalQuantity) {
        allDelivered = false
      }

      return {
        id: item.id,
        workCategory: item.workCategory,
        materialName: item.materialName,
        specifications: item.specifications,
        netQuantity: item.netQuantity,
        wastagePercent: item.wastagePercent,
        finalQuantity: item.finalQuantity,
        unit: item.unit,
        productionPhase: item.productionPhase,
        remarks: item.remarks,
        purchaseLines,
      }
    })

    return {
      id: req.id,
      requisitionNo: req.requisitionNo,
      status: req.status,
      notes: req.notes,
      rejectionReason: req.rejectionReason,
      cancellationReason: req.cancellationReason,
      createdAt: req.createdAt,
      updatedAt: req.updatedAt,
      lead: req.lead,
      createdBy: req.createdBy,
      items,
      amendments: req.amendments.map((a) => ({
        id: a.id,
        changeDescription: a.changeDescription,
        requestedAt: a.requestedAt,
        status: a.status,
        requestedBy: a.requestedBy,
        acknowledgedBy: a.acknowledgedBy,
        acknowledgedAt: a.acknowledgedAt,
      })),
      totalEstimatedCost,
      totalPaidAmount,
      allDelivered,
    }
  } catch (error) {
    console.error('Failed to get procurement requisition detail:', error)
    return null
  }
}

// -------------------------------------------------------------
// STATUS & WORKFLOW ACTIONS (ACCEPT, REJECT, CANCEL, FULFILL)
// -------------------------------------------------------------

export async function reviewRequisition(
  requisitionId: string,
  action: 'ACCEPT' | 'REJECT' | 'CANCEL' | 'FULFILL',
  reason?: string
) {
  try {
    let nextStatus: RequisitionStatus
    const updateData: Record<string, unknown> = {}

    if (action === 'ACCEPT') {
      nextStatus = 'IN_PROCUREMENT'
    } else if (action === 'REJECT') {
      nextStatus = 'REJECTED'
      updateData.rejectionReason = reason || 'Rejected during procurement review.'
    } else if (action === 'CANCEL') {
      nextStatus = 'CANCELLED'
      updateData.cancellationReason = reason || 'Cancelled by admin.'
    } else if (action === 'FULFILL') {
      nextStatus = 'FULFILLED'
    } else {
      return { success: false, error: 'Invalid action.' }
    }

    updateData.status = nextStatus

    const updated = await prisma.materialRequisition.update({
      where: { id: requisitionId },
      data: updateData,
    })

    revalidatePath('/procurement/dashboard')
    revalidatePath('/procurement/review-center')
    revalidatePath('/procurement/requisitions')
    revalidatePath(`/procurement/requisitions/${requisitionId}`)
    return { success: true, data: updated }
  } catch (error) {
    console.error('Failed to review requisition:', error)
    return { success: false, error: 'Could not update requisition status.' }
  }
}

export async function updateRequisitionStatus(
  requisitionId: string,
  status: RequisitionStatus,
  reason?: string
) {
  try {
    const data: Record<string, unknown> = { status }
    if (status === 'REJECTED' && reason) data.rejectionReason = reason
    if (status === 'CANCELLED' && reason) data.cancellationReason = reason

    const updated = await prisma.materialRequisition.update({
      where: { id: requisitionId },
      data,
    })

    revalidatePath('/procurement/dashboard')
    revalidatePath('/procurement/review-center')
    revalidatePath('/procurement/requisitions')
    revalidatePath(`/procurement/requisitions/${requisitionId}`)
    return { success: true, data: updated }
  } catch (error) {
    console.error('Failed to update requisition status:', error)
    return { success: false, error: 'Could not update requisition status.' }
  }
}

// -------------------------------------------------------------
// PURCHASE LINE MANAGEMENT (SPLIT PURCHASE, STOCK, COSTS)
// -------------------------------------------------------------

export type UpsertPurchaseLineInput = {
  id?: string
  requisitionItemId: string
  stockSource?: PurchaseStockSource
  supplierName?: string | null
  supplierPhone?: string | null
  supplierEmail?: string | null
  quantityOrdered: number
  quotedUnitPrice?: number | null
  negotiatedUnitPrice?: number | null
  transportCost?: number
  loadingCost?: number
  taxAmount?: number
  otherCosts?: number
  paymentStatus?: PurchasePaymentStatus
  paidAmount?: number
  deliveryStatus?: PurchaseDeliveryStatus
  returnReason?: string | null
  replacementNote?: string | null
  dateOrdered?: Date | null
  expectedDeliveryDate?: Date | null
  notes?: string | null
}

export async function upsertPurchaseLine(input: UpsertPurchaseLineInput) {
  try {
    const userId = await getCurrentUserId()

    const quantityOrdered = Number(input.quantityOrdered) || 1
    const negotiatedUnitPrice = input.negotiatedUnitPrice != null ? Number(input.negotiatedUnitPrice) : null
    const quotedUnitPrice = input.quotedUnitPrice != null ? Number(input.quotedUnitPrice) : null

    // Exact calculations as planned
    const materialTotal = negotiatedUnitPrice != null ? negotiatedUnitPrice * quantityOrdered : 0
    const transportCost = Number(input.transportCost) || 0
    const loadingCost = Number(input.loadingCost) || 0
    const taxAmount = Number(input.taxAmount) || 0
    const otherCosts = Number(input.otherCosts) || 0
    const totalPurchaseCost = materialTotal + transportCost + loadingCost + taxAmount + otherCosts

    const paidAmount = Number(input.paidAmount) || 0
    let paymentStatus = input.paymentStatus || 'UNPAID'
    if (paidAmount >= totalPurchaseCost && totalPurchaseCost > 0) {
      paymentStatus = 'PAID'
    } else if (paidAmount > 0 && paidAmount < totalPurchaseCost) {
      paymentStatus = 'PARTIALLY_PAID'
    }

    if (input.id) {
      const updated = await prisma.purchaseLine.update({
        where: { id: input.id },
        data: {
          stockSource: input.stockSource || 'PURCHASED',
          supplierName: input.supplierName,
          supplierPhone: input.supplierPhone,
          supplierEmail: input.supplierEmail,
          quantityOrdered,
          quotedUnitPrice,
          negotiatedUnitPrice,
          materialTotal,
          transportCost,
          loadingCost,
          taxAmount,
          otherCosts,
          totalPurchaseCost,
          paymentStatus,
          paidAmount,
          deliveryStatus: input.deliveryStatus,
          returnReason: input.returnReason,
          replacementNote: input.replacementNote,
          dateOrdered: input.dateOrdered,
          expectedDeliveryDate: input.expectedDeliveryDate,
          notes: input.notes,
          updatedById: userId,
        },
      })
      revalidatePath('/procurement/requisitions')
      revalidatePath('/procurement/finance')
      return { success: true, data: updated }
    } else {
      const created = await prisma.purchaseLine.create({
        data: {
          requisitionItemId: input.requisitionItemId,
          stockSource: input.stockSource || 'PURCHASED',
          supplierName: input.supplierName,
          supplierPhone: input.supplierPhone,
          supplierEmail: input.supplierEmail,
          quantityOrdered,
          quotedUnitPrice,
          negotiatedUnitPrice,
          materialTotal,
          transportCost,
          loadingCost,
          taxAmount,
          otherCosts,
          totalPurchaseCost,
          paymentStatus,
          paidAmount,
          deliveryStatus: input.deliveryStatus || 'PENDING',
          returnReason: input.returnReason,
          replacementNote: input.replacementNote,
          dateOrdered: input.dateOrdered || new Date(),
          expectedDeliveryDate: input.expectedDeliveryDate,
          notes: input.notes,
          createdById: userId,
          updatedById: userId,
        },
      })

      // If initial expected delivery date was provided, log it in DeliveryDateLog
      if (input.expectedDeliveryDate) {
        await prisma.deliveryDateLog.create({
          data: {
            purchaseLineId: created.id,
            promisedDate: input.expectedDeliveryDate,
            reason: 'Initial promised delivery date',
            loggedById: userId,
          },
        })
      }

      revalidatePath('/procurement/requisitions')
      revalidatePath('/procurement/finance')
      return { success: true, data: created }
    }
  } catch (error) {
    console.error('Failed to upsert purchase line:', error)
    return { success: false, error: 'Could not save purchase record.' }
  }
}

export async function deletePurchaseLine(purchaseLineId: string) {
  try {
    await prisma.purchaseLine.delete({
      where: { id: purchaseLineId },
    })
    revalidatePath('/procurement/requisitions')
    revalidatePath('/procurement/finance')
    return { success: true }
  } catch (error) {
    console.error('Failed to delete purchase line:', error)
    return { success: false, error: 'Could not delete purchase line.' }
  }
}

// -------------------------------------------------------------
// DELIVERY BATCHES (PARTIAL DELIVERY TRACKING)
// -------------------------------------------------------------

export async function addDeliveryBatch(
  purchaseLineId: string,
  quantityDelivered: number,
  deliveredAt?: Date,
  notes?: string
) {
  try {
    const userId = await getCurrentUserId()
    const qty = Number(quantityDelivered)
    if (qty <= 0) {
      return { success: false, error: 'Delivered quantity must be greater than zero.' }
    }

    const batch = await prisma.deliveryBatch.create({
      data: {
        purchaseLineId,
        quantityDelivered: qty,
        deliveredAt: deliveredAt || new Date(),
        notes: notes || null,
        receivedById: userId,
      },
    })

    // Sum all batches for this purchase line
    const totalDeliveredAgg = await prisma.deliveryBatch.aggregate({
      where: { purchaseLineId },
      _sum: { quantityDelivered: true },
    })

    const totalDelivered = totalDeliveredAgg._sum.quantityDelivered || 0

    // Fetch purchase line to compare with quantity ordered
    const pl = await prisma.purchaseLine.findUnique({
      where: { id: purchaseLineId },
      select: { quantityOrdered: true },
    })

    let newDeliveryStatus: PurchaseDeliveryStatus = 'PARTIALLY_DELIVERED'
    if (pl && totalDelivered >= pl.quantityOrdered) {
      newDeliveryStatus = 'DELIVERED'
    }

    await prisma.purchaseLine.update({
      where: { id: purchaseLineId },
      data: {
        quantityDelivered: totalDelivered,
        deliveryStatus: newDeliveryStatus,
        updatedById: userId,
      },
    })

    revalidatePath('/procurement/requisitions')
    return { success: true, data: batch, totalDelivered, status: newDeliveryStatus }
  } catch (error) {
    console.error('Failed to add delivery batch:', error)
    return { success: false, error: 'Could not record delivery batch.' }
  }
}

// -------------------------------------------------------------
// DELIVERY DATE TIMELINE (SUPPLIER DELAY TRACKING)
// -------------------------------------------------------------

export async function logDeliveryDate(
  purchaseLineId: string,
  promisedDate: Date,
  reason?: string
) {
  try {
    const userId = await getCurrentUserId()

    const logEntry = await prisma.deliveryDateLog.create({
      data: {
        purchaseLineId,
        promisedDate,
        reason: reason || null,
        loggedById: userId,
      },
    })

    // Also update the current expectedDeliveryDate on purchaseLine
    await prisma.purchaseLine.update({
      where: { id: purchaseLineId },
      data: {
        expectedDeliveryDate: promisedDate,
        updatedById: userId,
      },
    })

    revalidatePath('/procurement/requisitions')
    return { success: true, data: logEntry }
  } catch (error) {
    console.error('Failed to log delivery date:', error)
    return { success: false, error: 'Could not log delivery date.' }
  }
}

// -------------------------------------------------------------
// PURCHASE DOCUMENTS (INVOICES, DELIVERY NOTES, RECEIPTS)
// -------------------------------------------------------------

export async function addPurchaseDocument(
  purchaseLineId: string,
  input: {
    documentType: PurchaseDocumentType
    fileUrl: string
    fileName?: string | null
    fileSize?: number | null
    notes?: string | null
  }
) {
  try {
    const userId = await getCurrentUserId()

    const doc = await prisma.purchaseDocument.create({
      data: {
        purchaseLineId,
        documentType: input.documentType,
        fileUrl: input.fileUrl,
        fileName: input.fileName || null,
        fileSize: input.fileSize || null,
        notes: input.notes || null,
        uploadedById: userId,
      },
    })

    revalidatePath('/procurement/requisitions')
    revalidatePath('/procurement/finance')
    return { success: true, data: doc }
  } catch (error) {
    console.error('Failed to add purchase document:', error)
    return { success: false, error: 'Could not upload document.' }
  }
}

export async function deletePurchaseDocument(documentId: string) {
  try {
    await prisma.purchaseDocument.delete({
      where: { id: documentId },
    })
    revalidatePath('/procurement/requisitions')
    revalidatePath('/procurement/finance')
    return { success: true }
  } catch (error) {
    console.error('Failed to delete purchase document:', error)
    return { success: false, error: 'Could not delete document.' }
  }
}

// -------------------------------------------------------------
// REQUISITION AMENDMENTS (BOQ REQUISITION CHANGES)
// -------------------------------------------------------------

export async function requestRequisitionAmendment(
  requisitionId: string,
  changeDescription: string
) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { success: false, error: 'User must be authenticated.' }
    }

    const amendment = await prisma.requisitionAmendment.create({
      data: {
        requisitionId,
        changeDescription,
        requestedById: userId,
        status: 'PENDING',
      },
    })

    revalidatePath(`/procurement/requisitions/${requisitionId}`)
    return { success: true, data: amendment }
  } catch (error) {
    console.error('Failed to request requisition amendment:', error)
    return { success: false, error: 'Could not submit amendment request.' }
  }
}

export async function acknowledgeRequisitionAmendment(amendmentId: string) {
  try {
    const userId = await getCurrentUserId()

    const updated = await prisma.requisitionAmendment.update({
      where: { id: amendmentId },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedById: userId,
        acknowledgedAt: new Date(),
      },
    })

    revalidatePath('/procurement/requisitions')
    return { success: true, data: updated }
  } catch (error) {
    console.error('Failed to acknowledge requisition amendment:', error)
    return { success: false, error: 'Could not acknowledge amendment.' }
  }
}

// -------------------------------------------------------------
// FINANCE OVERVIEW & REPORTING
// -------------------------------------------------------------

export type ProcurementFinanceOverview = {
  totalSpend: number
  totalPaid: number
  totalOutstanding: number
  costBreakdown: {
    materials: number
    transport: number
    loading: number
    tax: number
    others: number
  }
  projectSpends: Array<{
    leadId: string
    projectName: string
    clientPhone: string | null
    location: string | null
    requisitionCount: number
    totalSpend: number
    totalPaid: number
    outstanding: number
  }>
  pendingPayments: Array<{
    purchaseLineId: string
    requisitionNo: string
    projectName: string
    materialName: string
    supplierName: string | null
    supplierPhone: string | null
    totalPurchaseCost: number
    paidAmount: number
    dueAmount: number
    paymentStatus: PurchasePaymentStatus
  }>
  pendingInvoices: Array<{
    purchaseLineId: string
    requisitionNo: string
    projectName: string
    materialName: string
    supplierName: string | null
    totalPurchaseCost: number
    dateOrdered: Date | null
  }>
}

export async function getProcurementFinanceOverview(): Promise<ProcurementFinanceOverview> {
  try {
    const [allPurchaseLines, leadsWithRequisitions] = await Promise.all([
      prisma.purchaseLine.findMany({
        include: {
          requisitionItem: {
            include: {
              requisition: {
                include: {
                  lead: {
                    select: {
                      id: true,
                      name: true,
                      phone: true,
                      location: true,
                    },
                  },
                },
              },
            },
          },
          documents: {
            select: { id: true },
          },
        },
      }),
      prisma.lead.findMany({
        where: {
          materialRequisitions: {
            some: {},
          },
        },
        select: {
          id: true,
          name: true,
          phone: true,
          location: true,
          materialRequisitions: {
            select: {
              id: true,
              items: {
                select: {
                  purchaseLines: {
                    select: {
                      totalPurchaseCost: true,
                      paidAmount: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ])

    let totalSpend = 0
    let totalPaid = 0
    let materials = 0
    let transport = 0
    let loading = 0
    let tax = 0
    let others = 0

    const pendingPayments: ProcurementFinanceOverview['pendingPayments'] = []
    const pendingInvoices: ProcurementFinanceOverview['pendingInvoices'] = []

    for (const pl of allPurchaseLines) {
      totalSpend += pl.totalPurchaseCost
      totalPaid += pl.paidAmount

      materials += pl.materialTotal
      transport += pl.transportCost
      loading += pl.loadingCost
      tax += pl.taxAmount
      others += pl.otherCosts

      const dueAmount = Math.max(0, pl.totalPurchaseCost - pl.paidAmount)
      if (pl.paymentStatus !== 'PAID' && dueAmount > 0) {
        pendingPayments.push({
          purchaseLineId: pl.id,
          requisitionNo: pl.requisitionItem.requisition.requisitionNo,
          projectName: pl.requisitionItem.requisition.lead.name,
          materialName: pl.requisitionItem.materialName,
          supplierName: pl.supplierName,
          supplierPhone: pl.supplierPhone,
          totalPurchaseCost: pl.totalPurchaseCost,
          paidAmount: pl.paidAmount,
          dueAmount,
          paymentStatus: pl.paymentStatus,
        })
      }

      if (pl.documents.length === 0 && pl.stockSource === 'PURCHASED') {
        pendingInvoices.push({
          purchaseLineId: pl.id,
          requisitionNo: pl.requisitionItem.requisition.requisitionNo,
          projectName: pl.requisitionItem.requisition.lead.name,
          materialName: pl.requisitionItem.materialName,
          supplierName: pl.supplierName,
          totalPurchaseCost: pl.totalPurchaseCost,
          dateOrdered: pl.dateOrdered,
        })
      }
    }

    const projectSpends: ProcurementFinanceOverview['projectSpends'] = leadsWithRequisitions.map((lead) => {
      let leadSpend = 0
      let leadPaid = 0
      for (const req of lead.materialRequisitions) {
        for (const it of req.items) {
          for (const pl of it.purchaseLines) {
            leadSpend += pl.totalPurchaseCost
            leadPaid += pl.paidAmount
          }
        }
      }

      return {
        leadId: lead.id,
        projectName: lead.name,
        clientPhone: lead.phone,
        location: lead.location,
        requisitionCount: lead.materialRequisitions.length,
        totalSpend: leadSpend,
        totalPaid: leadPaid,
        outstanding: Math.max(0, leadSpend - leadPaid),
      }
    })

    return {
      totalSpend,
      totalPaid,
      totalOutstanding: Math.max(0, totalSpend - totalPaid),
      costBreakdown: {
        materials,
        transport,
        loading,
        tax,
        others,
      },
      projectSpends: projectSpends.sort((a, b) => b.totalSpend - a.totalSpend),
      pendingPayments: pendingPayments.sort((a, b) => b.dueAmount - a.dueAmount),
      pendingInvoices: pendingInvoices.slice(0, 15),
    }
  } catch (error) {
    console.error('Failed to get procurement finance overview:', error)
    return {
      totalSpend: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      costBreakdown: { materials: 0, transport: 0, loading: 0, tax: 0, others: 0 },
      projectSpends: [],
      pendingPayments: [],
      pendingInvoices: [],
    }
  }
}
