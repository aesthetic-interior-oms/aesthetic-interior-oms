'use server'

/* eslint-disable @typescript-eslint/no-explicit-any */
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@clerk/nextjs/server'

export type AttachedDocument = {
  id: string
  name: string
  url: string
  sizeBytes?: number
  uploadedAt: string
}

export type ItemPurchaseRecord = {
  isBought: boolean
  vendorId?: string | null
  vendorName: string
  vendorPhone?: string
  vendorEmail?: string
  invoiceNo: string
  billDate?: string
  billQuantity: number
  unitPrice: number
  materialTotal: number
  transportCost: number
  otherCost: number
  totalAmount: number
  paidAmount: number
  dueAmount: number
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID'
  settlementMethod?: 'PETTY_CASH' | 'PURCHASE_TEAM' | 'COMPANY_ACCOUNT' | 'VENDOR_CREDIT' | 'OTHER'
  purchasedBy?: string
  notes?: string
  documents?: AttachedDocument[]
  recordedAt?: string
  recordedBy?: string
}

export type DeliveryBatch = {
  id: string
  batchNo: number
  quantity: number
  deliveryDate: string
  challanNo?: string
  receivedBy?: string
  notes?: string
  createdAt: string
}

export type ItemDeliveryRecord = {
  expectedDeliveryDate?: string | null
  dateChangeHistory?: Array<{
    previousDate?: string | null
    newDate: string
    reason: string
    changedAt: string
    changedBy: string
  }>
  batches: DeliveryBatch[]
  totalDelivered: number
  deliveryStatus: 'PENDING' | 'PARTIALLY_DELIVERED' | 'FULLY_DELIVERED'
  documents?: AttachedDocument[]
}

async function getActorName(): Promise<string> {
  try {
    const { userId } = await auth()
    if (!userId) return 'Procurement Team'
    const dbUser = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { fullName: true },
    })
    return dbUser?.fullName || 'Procurement Team'
  } catch {
    return 'Procurement Team'
  }
}

export async function saveItemPurchaseRecordAction(params: {
  itemId: string
  requisitionId: string
  record: ItemPurchaseRecord
}) {
  const { itemId, requisitionId, record } = params
  const actorName = await getActorName()

  const item = await prisma.materialRequisitionItem.findUnique({
    where: { id: itemId },
    select: { variantAttributes: true },
  })

  if (!item) {
    throw new Error('Item not found')
  }

  const existingAttrs = (item.variantAttributes as Record<string, any>) || {}

  // Calculate clean numbers and payment status
  const materialTotal = Number(record.billQuantity || 0) * Number(record.unitPrice || 0)
  const transportCost = Number(record.transportCost || 0)
  const otherCost = Number(record.otherCost || 0)
  const totalAmount = materialTotal + transportCost + otherCost
  const paidAmount = Number(record.paidAmount || 0)
  const dueAmount = Math.max(0, totalAmount - paidAmount)

  let paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' = 'UNPAID'
  if (paidAmount >= totalAmount && totalAmount > 0) {
    paymentStatus = 'PAID'
  } else if (paidAmount > 0) {
    paymentStatus = 'PARTIALLY_PAID'
  }

  const enrichedRecord: ItemPurchaseRecord = {
    ...record,
    materialTotal,
    transportCost,
    otherCost,
    totalAmount,
    paidAmount,
    dueAmount,
    paymentStatus,
    isBought: true,
    recordedAt: new Date().toISOString(),
    recordedBy: actorName,
  }

  const updatedAttrs = {
    ...existingAttrs,
    billingRecord: enrichedRecord,
    purchaseRecord: enrichedRecord,
  }

  await prisma.materialRequisitionItem.update({
    where: { id: itemId },
    data: { variantAttributes: updatedAttrs },
  })

  // Ensure requisition is at least IN_PROCUREMENT
  await prisma.materialRequisition.updateMany({
    where: { id: requisitionId, status: 'SUBMITTED' },
    data: { status: 'IN_PROCUREMENT' },
  })

  revalidatePath(`/procurement/billing-center/${requisitionId}`)
  revalidatePath(`/procurement/billing-center/${requisitionId}/delivery`)
  revalidatePath('/procurement/billing-center')
  return { success: true, record: enrichedRecord }
}

export async function removeItemPurchaseRecordAction(params: {
  itemId: string
  requisitionId: string
}) {
  const { itemId, requisitionId } = params

  const item = await prisma.materialRequisitionItem.findUnique({
    where: { id: itemId },
    select: { variantAttributes: true },
  })

  if (!item) throw new Error('Item not found')

  const existingAttrs = { ...((item.variantAttributes as Record<string, any>) || {}) }
  delete existingAttrs.billingRecord
  delete existingAttrs.purchaseRecord

  await prisma.materialRequisitionItem.update({
    where: { id: itemId },
    data: { variantAttributes: existingAttrs },
  })

  revalidatePath(`/procurement/billing-center/${requisitionId}`)
  revalidatePath(`/procurement/billing-center/${requisitionId}/delivery`)
  revalidatePath('/procurement/billing-center')
  return { success: true }
}

export async function saveItemDeliveryDateAction(params: {
  itemId: string
  requisitionId: string
  expectedDeliveryDate: string
  reason?: string
}) {
  const { itemId, requisitionId, expectedDeliveryDate, reason } = params
  const actorName = await getActorName()

  const item = await prisma.materialRequisitionItem.findUnique({
    where: { id: itemId },
    select: { variantAttributes: true },
  })

  if (!item) throw new Error('Item not found')

  const attrs = (item.variantAttributes as Record<string, any>) || {}
  const currentDelivery: ItemDeliveryRecord = attrs.deliveryRecord || {
    batches: [],
    totalDelivered: 0,
    deliveryStatus: 'PENDING',
  }

  const previousDate = currentDelivery.expectedDeliveryDate || null
  const history = currentDelivery.dateChangeHistory || []

  if (previousDate !== expectedDeliveryDate) {
    history.push({
      previousDate,
      newDate: expectedDeliveryDate,
      reason: reason || 'Scheduled delivery update',
      changedAt: new Date().toISOString(),
      changedBy: actorName,
    })
  }

  const updatedDelivery: ItemDeliveryRecord = {
    ...currentDelivery,
    expectedDeliveryDate,
    dateChangeHistory: history,
  }

  await prisma.materialRequisitionItem.update({
    where: { id: itemId },
    data: {
      variantAttributes: {
        ...attrs,
        deliveryRecord: updatedDelivery,
      },
    },
  })

  revalidatePath(`/procurement/billing-center/${requisitionId}`)
  revalidatePath(`/procurement/billing-center/${requisitionId}/delivery`)
  return { success: true, delivery: updatedDelivery }
}

export async function logDeliveryBatchAction(params: {
  itemId: string
  requisitionId: string
  quantity: number
  deliveryDate: string
  challanNo?: string
  receivedBy?: string
  notes?: string
}) {
  const { itemId, requisitionId, quantity, deliveryDate, challanNo, receivedBy, notes } = params
  const actorName = await getActorName()

  const item = await prisma.materialRequisitionItem.findUnique({
    where: { id: itemId },
    select: { variantAttributes: true, finalQuantity: true },
  })

  if (!item) throw new Error('Item not found')

  const attrs = (item.variantAttributes as Record<string, any>) || {}
  const currentDelivery: ItemDeliveryRecord = attrs.deliveryRecord || {
    batches: [],
    totalDelivered: 0,
    deliveryStatus: 'PENDING',
  }

  const batches = currentDelivery.batches || []
  const newBatch: DeliveryBatch = {
    id: `BATCH-${Date.now().toString().slice(-6)}`,
    batchNo: batches.length + 1,
    quantity: Number(quantity),
    deliveryDate,
    challanNo: challanNo?.trim(),
    receivedBy: receivedBy?.trim() || actorName,
    notes: notes?.trim(),
    createdAt: new Date().toISOString(),
  }

  const updatedBatches = [...batches, newBatch]
  const totalDelivered = updatedBatches.reduce((acc, b) => acc + (b.quantity || 0), 0)

  let deliveryStatus: 'PENDING' | 'PARTIALLY_DELIVERED' | 'FULLY_DELIVERED' = 'PENDING'
  if (totalDelivered >= item.finalQuantity && totalDelivered > 0) {
    deliveryStatus = 'FULLY_DELIVERED'
  } else if (totalDelivered > 0) {
    deliveryStatus = 'PARTIALLY_DELIVERED'
  }

  const updatedDelivery: ItemDeliveryRecord = {
    ...currentDelivery,
    batches: updatedBatches,
    totalDelivered,
    deliveryStatus,
  }

  await prisma.materialRequisitionItem.update({
    where: { id: itemId },
    data: {
      variantAttributes: {
        ...attrs,
        deliveryRecord: updatedDelivery,
      },
    },
  })

  revalidatePath(`/procurement/billing-center/${requisitionId}`)
  revalidatePath(`/procurement/billing-center/${requisitionId}/delivery`)
  return { success: true, delivery: updatedDelivery }
}

export async function attachItemDocumentAction(params: {
  itemId: string
  requisitionId: string
  target: 'PURCHASE' | 'DELIVERY'
  document: AttachedDocument
}) {
  const { itemId, requisitionId, target, document } = params

  const item = await prisma.materialRequisitionItem.findUnique({
    where: { id: itemId },
    select: { variantAttributes: true },
  })

  if (!item) throw new Error('Item not found')

  const attrs = (item.variantAttributes as Record<string, any>) || {}

  if (target === 'PURCHASE') {
    const pRec: ItemPurchaseRecord = attrs.billingRecord || attrs.purchaseRecord || {
      isBought: true,
      vendorName: 'Direct',
      invoiceNo: '',
      billQuantity: 0,
      unitPrice: 0,
      materialTotal: 0,
      transportCost: 0,
      otherCost: 0,
      totalAmount: 0,
      paidAmount: 0,
      dueAmount: 0,
      paymentStatus: 'UNPAID',
    }
    const currentDocs = pRec.documents || []
    const updatedDocs = [...currentDocs, document]
    const updatedPRec = { ...pRec, documents: updatedDocs }

    await prisma.materialRequisitionItem.update({
      where: { id: itemId },
      data: {
        variantAttributes: {
          ...attrs,
          billingRecord: updatedPRec,
          purchaseRecord: updatedPRec,
        },
      },
    })
  } else {
    const dRec: ItemDeliveryRecord = attrs.deliveryRecord || {
      batches: [],
      totalDelivered: 0,
      deliveryStatus: 'PENDING',
    }
    const currentDocs = dRec.documents || []
    const updatedDocs = [...currentDocs, document]
    const updatedDRec = { ...dRec, documents: updatedDocs }

    await prisma.materialRequisitionItem.update({
      where: { id: itemId },
      data: {
        variantAttributes: {
          ...attrs,
          deliveryRecord: updatedDRec,
        },
      },
    })
  }

  revalidatePath(`/procurement/billing-center/${requisitionId}`)
  revalidatePath(`/procurement/billing-center/${requisitionId}/delivery`)
  return { success: true }
}

export async function removeAttachedDocumentAction(params: {
  itemId: string
  requisitionId: string
  target: 'PURCHASE' | 'DELIVERY'
  documentId: string
}) {
  const { itemId, requisitionId, target, documentId } = params

  const item = await prisma.materialRequisitionItem.findUnique({
    where: { id: itemId },
    select: { variantAttributes: true },
  })

  if (!item) throw new Error('Item not found')

  const attrs = (item.variantAttributes as Record<string, any>) || {}

  if (target === 'PURCHASE') {
    const pRec: ItemPurchaseRecord = attrs.billingRecord || attrs.purchaseRecord
    if (pRec && pRec.documents) {
      pRec.documents = pRec.documents.filter((d) => d.id !== documentId)
      await prisma.materialRequisitionItem.update({
        where: { id: itemId },
        data: {
          variantAttributes: {
            ...attrs,
            billingRecord: pRec,
            purchaseRecord: pRec,
          },
        },
      })
    }
  } else {
    const dRec: ItemDeliveryRecord = attrs.deliveryRecord
    if (dRec && dRec.documents) {
      dRec.documents = dRec.documents.filter((d) => d.id !== documentId)
      await prisma.materialRequisitionItem.update({
        where: { id: itemId },
        data: {
          variantAttributes: {
            ...attrs,
            deliveryRecord: dRec,
          },
        },
      })
    }
  }

  revalidatePath(`/procurement/billing-center/${requisitionId}`)
  revalidatePath(`/procurement/billing-center/${requisitionId}/delivery`)
  return { success: true }
}

export async function dispatchBillingToAccountsAction(params: {
  requisitionId: string
  orderNotes?: string
  totalBilledAmount: number
  totalBilledItems: number
  settlementBreakdown: {
    pettyCash: number
    purchaseTeam: number
    companyAccount: number
    vendorCredit: number
    other: number
  }
}) {
  const {
    requisitionId,
    orderNotes,
    totalBilledAmount,
    totalBilledItems,
    settlementBreakdown,
  } = params

  const actorName = await getActorName()
  const dispatchDate = new Date().toLocaleDateString('en-GB')
  const dispatchRef = `BILL-DISPATCH-${Date.now().toString().slice(-6)}`

  const dispatchSummary = `[ACCOUNTS DISPATCH ${dispatchRef} on ${dispatchDate} by ${actorName}]: Billed ${totalBilledItems} items totaling ৳${totalBilledAmount.toLocaleString('en-BD')}. Adjustment split: Petty Cash=৳${settlementBreakdown.pettyCash.toLocaleString('en-BD')}, Purchase Team=৳${settlementBreakdown.purchaseTeam.toLocaleString('en-BD')}, Bank/Credit=৳${(settlementBreakdown.companyAccount + settlementBreakdown.vendorCredit).toLocaleString('en-BD')}. Notes: ${orderNotes || 'Standard requisition settlement'}`

  const req = await prisma.materialRequisition.findUnique({
    where: { id: requisitionId },
    select: { notes: true, items: { select: { id: true, variantAttributes: true } } },
  })

  if (!req) throw new Error('Requisition not found')

  const allBilled = req.items.every((it) => {
    const attrs = (it.variantAttributes as Record<string, any>) || {}
    return Boolean(attrs.billingRecord?.isBought || attrs.purchaseRecord?.isBought)
  })

  const newNotes = req.notes ? `${req.notes}\n\n${dispatchSummary}` : dispatchSummary

  await prisma.materialRequisition.update({
    where: { id: requisitionId },
    data: {
      status: allBilled ? 'FULFILLED' : 'IN_PROCUREMENT',
      notes: newNotes,
    },
  })

  revalidatePath(`/procurement/billing-center/${requisitionId}`)
  revalidatePath(`/procurement/billing-center/${requisitionId}/delivery`)
  revalidatePath('/procurement/billing-center')
  revalidatePath('/procurement/dashboard')

  return { success: true, dispatchRef }
}
