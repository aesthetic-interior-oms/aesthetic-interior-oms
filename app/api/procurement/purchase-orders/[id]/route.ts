import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { canApprovePO, canVerifyPOLeadStage } from '@/lib/purchase-order'
import { NotificationType, Prisma } from '@/generated/prisma/client'
import {
  disburseProcurementAdvance,
  recordPurchaseOrderWalletExpense,
} from '@/lib/procurement-wallet-service'

export const runtime = 'nodejs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const auth = await requireDatabaseRoles([])
  if (!auth.ok) return auth.response

  const roles = auth.actorRoles ?? []
  const departments = auth.actor.userDepartments ?? []

  const body = await request.json().catch(() => null)
  if (
    !body ||
    !['LEAD_VERIFY', 'LEAD_REJECT', 'APPROVED', 'REJECTED', 'FULFILLED'].includes(body.action)
  ) {
    return NextResponse.json(
      { error: 'action must be LEAD_VERIFY, LEAD_REJECT, APPROVED, REJECTED, or FULFILLED' },
      { status: 400 },
    )
  }

  const isProcurement =
    departments.some((d) => d.toUpperCase().includes('PROCUREMENT')) ||
    roles.some((r) => r.toUpperCase().includes('PROCUREMENT'))
  const isAccounts = canApprovePO(roles, departments)
  const isLeadVerifier = canVerifyPOLeadStage(roles, departments)

  if (body.action === 'LEAD_VERIFY' || body.action === 'LEAD_REJECT') {
    if (!isLeadVerifier) {
      return NextResponse.json(
        {
          error:
            'Only Procurement Leader, Project Coordinator, or Admin can verify Purchase Orders before Accounts',
        },
        { status: 403 },
      )
    }
  } else if (body.action === 'FULFILLED') {
    if (!isProcurement && !isAccounts) {
      return NextResponse.json(
        { error: 'Only Procurement or Accounts can mark a PO as fulfilled' },
        { status: 403 },
      )
    }
  } else if (!isAccounts) {
    return NextResponse.json(
      { error: 'Only Accounts team can approve or reject Purchase Orders' },
      { status: 403 },
    )
  }

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { lead: { select: { id: true, name: true } } },
  })
  if (!po) return NextResponse.json({ error: 'Purchase Order not found' }, { status: 404 })

  if (body.action === 'LEAD_VERIFY' || body.action === 'LEAD_REJECT') {
    if (po.status !== 'PENDING_LEAD_APPROVAL') {
      return NextResponse.json(
        { error: `Purchase Order is already ${po.status.replace(/_/g, ' ')}` },
        { status: 409 },
      )
    }

    if (body.action === 'LEAD_REJECT') {
      const reason = typeof body.rejectionReason === 'string' ? body.rejectionReason.trim() : ''
      if (!reason) {
        return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 })
      }
      const updated = await prisma.purchaseOrder.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectedById: auth.actorUserId,
          rejectedAt: new Date(),
          rejectionReason: reason,
          leadVerificationNote: body.note?.trim() || null,
        },
        include: {
          leadVerifiedBy: { select: { fullName: true } },
          approvedBy: { select: { fullName: true } },
          rejectedBy: { select: { fullName: true } },
        },
      })

      try {
        await prisma.notification.create({
          data: {
            userId: po.createdById,
            leadId: po.leadId,
            type: NotificationType.LEAD_ASSIGNED_TO_YOU,
            title: 'Purchase Order Rejected',
            message: `${po.poNo} for ${po.lead.name} was rejected: "${reason}"`,
            scheduledFor: new Date(),
          },
        })
      } catch {}

      return NextResponse.json({ success: true, data: updated })
    }

    // LEAD_VERIFY -> Forward to Accounts
    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'PENDING_ACCOUNTS_APPROVAL',
        leadVerifiedById: auth.actorUserId,
        leadVerifiedAt: new Date(),
        leadVerificationNote: body.note?.trim() || null,
      },
      include: {
        leadVerifiedBy: { select: { fullName: true } },
        approvedBy: { select: { fullName: true } },
        rejectedBy: { select: { fullName: true } },
      },
    })

    // Notify Accounts team
    try {
      const accountsUsers = await prisma.user.findMany({
        where: {
          isActive: true,
          userDepartments: {
            some: {
              department: { name: { in: ['ACCOUNTS', 'Accounts', 'FINANCE', 'Finance'] } },
            },
          },
        },
        select: { id: true },
      })
      if (accountsUsers.length > 0) {
        await prisma.notification.createMany({
          data: accountsUsers.map((u) => ({
            userId: u.id,
            leadId: po.leadId,
            type: NotificationType.LEAD_ASSIGNED_TO_YOU,
            title: 'Verified PO Ready for Accounts',
            message: `${po.poNo} (${po.lead.name}) has been verified and forwarded to Accounts (৳${po.totalAmount.toLocaleString()}).`,
            scheduledFor: new Date(),
          })),
        })
      }
    } catch {}

    return NextResponse.json({ success: true, data: updated })
  }

  if (body.action === 'FULFILLED') {
    if (po.status === 'PENDING_LEAD_APPROVAL') {
      return NextResponse.json(
        { error: 'Purchase Order must be verified by Procurement Leader / PC / Admin and approved by Accounts first' },
        { status: 409 },
      )
    }
    if (po.status === 'PENDING_ACCOUNTS_APPROVAL') {
      return NextResponse.json(
        { error: 'Purchase Order is awaiting Accounts approval before purchase completion' },
        { status: 409 },
      )
    }
    if (po.status === 'FULFILLED') {
      return NextResponse.json({ error: 'Purchase Order is already fulfilled' }, { status: 409 })
    }
    if (po.status === 'REJECTED') {
      return NextResponse.json({ error: 'Rejected Purchase Orders cannot be fulfilled' }, { status: 409 })
    }

    const verifiedItems = Array.isArray(body.verifiedItems)
      ? (body.verifiedItems as Array<{
          indentItemId: string
          purchased: boolean
          actualQuantity?: number
        }>)
      : null

    const now = new Date()

    try {
      const updated = await prisma.$transaction(async (tx) => {
        const fullPo = await tx.purchaseOrder.findUnique({
          where: { id },
          include: {
            indent: {
              include: {
                items: {
                  include: {
                    requisitionItem: true,
                  },
                },
              },
            },
          },
        })

        if (!fullPo) throw new Error('Purchase Order not found')

        const indent = fullPo.indent
        const verifyMap = new Map(
          (verifiedItems ?? []).map((v) => [v.indentItemId, v]),
        )

        const purchasedSummary: Array<{
          materialName: string
          quantity: number
          unit: string
          unitPrice: number
          total: number
          supplierName?: string | null
        }> = []

        for (const indentItem of indent.items) {
          const decision = verifyMap.get(indentItem.id)

          if (verifiedItems && decision && decision.purchased === false) {
            // Excluded / not purchased -> remove from indent & return to Requisition List
            await tx.materialIndentItem.delete({
              where: { id: indentItem.id },
            })

            const remainingIndentCount = await tx.materialIndentItem.count({
              where: { requisitionItemId: indentItem.requisitionItemId },
            })

            if (remainingIndentCount === 0) {
              await tx.materialRequisitionItem.update({
                where: { id: indentItem.requisitionItemId },
                data: {
                  status: 'NOTED',
                  purchasedQuantity: null,
                  purchasedAt: null,
                },
              })
            }
          } else {
            // Purchased -> allow lower or higher actual quantity
            let finalQty = Number(indentItem.quantity)
            if (decision && decision.actualQuantity !== undefined && decision.actualQuantity !== null) {
              const parsedQty = Number(decision.actualQuantity)
              if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
                throw new Error(
                  `Invalid purchased quantity for ${indentItem.requisitionItem.materialName}`,
                )
              }
              finalQty = parsedQty
            }

            const unitPrice = Number(indentItem.unitPrice)
            const lineTotal = finalQty * unitPrice

            if (Math.abs(finalQty - Number(indentItem.quantity)) > 0.0001) {
              await tx.materialIndentItem.update({
                where: { id: indentItem.id },
                data: {
                  quantity: new Prisma.Decimal(finalQty),
                  total: new Prisma.Decimal(lineTotal),
                },
              })
            }

            // Mark material in Requisition List as PURCHASED & locked from BOQ edits
            await tx.materialRequisitionItem.update({
              where: { id: indentItem.requisitionItemId },
              data: {
                status: 'PURCHASED',
                purchasedQuantity: finalQty,
                purchasedAt: now,
              },
            })

            purchasedSummary.push({
              materialName: indentItem.requisitionItem.materialName,
              quantity: finalQty,
              unit: indentItem.requisitionItem.unit,
              unitPrice,
              total: lineTotal,
              supplierName: indentItem.vendorName || indent.vendorName || fullPo.supplierName,
            })
          }
        }

        // Recalculate Indent subtotal & total
        const remainingLines = await tx.materialIndentItem.findMany({
          where: { indentId: indent.id },
        })
        const subtotal = remainingLines.reduce((sum, row) => sum + Number(row.total), 0)
        const total =
          subtotal + Number(indent.transportCost) + Number(indent.otherCosts)

        await tx.materialIndent.update({
          where: { id: indent.id },
          data: {
            subtotal: new Prisma.Decimal(subtotal),
            total: new Prisma.Decimal(total),
          },
        })

        // Update Purchase Order
        const savedPo = await tx.purchaseOrder.update({
          where: { id },
          data: {
            status: 'FULFILLED',
            totalAmount: total,
            notes: body.notes
              ? `${po.notes ? po.notes + '\n' : ''}${String(body.notes).trim()}`
              : po.notes,
          },
          include: {
            approvedBy: { select: { fullName: true } },
            rejectedBy: { select: { fullName: true } },
          },
        })

        // Automatically log expense in the Procurement Member's wallet
        if (total > 0 && purchasedSummary.length > 0) {
          await recordPurchaseOrderWalletExpense(tx, {
            userId: body.walletUserId || auth.actorUserId,
            submittedById: auth.actorUserId,
            purchaseOrderId: savedPo.id,
            poNo: savedPo.poNo,
            leadId: indent.leadId,
            materialRequisitionId: indent.requisitionId,
            supplierName: savedPo.supplierName || indent.vendorName || null,
            totalAmount: total,
            materialsSummary: purchasedSummary,
            note: typeof body.notes === 'string' ? body.notes.trim() : undefined,
          })
        }

        // Sync Requisition overall status
        const allReqItems = await tx.materialRequisitionItem.findMany({
          where: { requisitionId: indent.requisitionId },
          select: {
            status: true,
            finalQuantity: true,
            indentItems: { select: { quantity: true } },
          },
        })
        const fullyBilledOrPurchased =
          allReqItems.length > 0 &&
          allReqItems.every(
            (i) =>
              i.status === 'PURCHASED' ||
              i.indentItems.reduce((s, r) => s + Number(r.quantity), 0) >=
                i.finalQuantity - 0.0001,
          )
        const anyBilledOrPurchased = allReqItems.some(
          (i) =>
            i.status !== 'NOTED' ||
            i.indentItems.some((r) => Number(r.quantity) > 0),
        )

        await tx.materialRequisition.update({
          where: { id: indent.requisitionId },
          data: {
            status: fullyBilledOrPurchased
              ? 'FULFILLED'
              : anyBilledOrPurchased
                ? 'IN_PROCUREMENT'
                : 'SUBMITTED',
          },
        })

        return savedPo
      })

      return NextResponse.json({ success: true, data: updated })
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to complete Purchase Order' },
        { status: 400 },
      )
    }
  }

  if (po.status !== 'PENDING_ACCOUNTS_APPROVAL') {
    return NextResponse.json({ error: `Purchase Order is already ${po.status}` }, { status: 409 })
  }

  if (body.action === 'REJECTED' && !body.rejectionReason?.trim()) {
    return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 })
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data:
      body.action === 'APPROVED'
        ? {
            status: 'APPROVED',
            approvedById: auth.actorUserId,
            approvedAt: new Date(),
            accountsNote: body.accountsNote?.trim() || null,
          }
        : {
            status: 'REJECTED',
            rejectedById: auth.actorUserId,
            rejectedAt: new Date(),
            rejectionReason: body.rejectionReason.trim(),
            accountsNote: body.accountsNote?.trim() || null,
          },
    include: {
      approvedBy: { select: { fullName: true } },
      rejectedBy: { select: { fullName: true } },
    },
  })

  if (body.action === 'APPROVED' && typeof body.disburseFromAccountId === 'string' && body.disburseFromAccountId) {
    try {
      await disburseProcurementAdvance({
        userId: po.createdById,
        financeAccountId: body.disburseFromAccountId,
        amount: Number(po.totalAmount),
        charge: Number(body.disburseCharge || 0),
        paymentMethod: body.disbursePaymentMethod || 'BANK_TRANSFER',
        particular: `Advance for ${po.poNo} (${po.lead.name})`,
        recordedById: auth.actorUserId,
      })
    } catch (disburseErr) {
      console.error('[PO Approval] Failed to auto-disburse advance:', disburseErr)
    }
  }

  return NextResponse.json({ success: true, data: updated })
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const auth = await requireDatabaseRoles([])
  if (!auth.ok) return auth.response

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      indent: {
        include: {
          items: {
            include: {
              requisitionItem: {
                select: { materialName: true, unit: true, workCategory: true, specifications: true },
              },
            },
          },
          createdBy: { select: { fullName: true } },
        },
      },
      createdBy: { select: { fullName: true } },
      approvedBy: { select: { fullName: true } },
      rejectedBy: { select: { fullName: true } },
      lead: { select: { id: true, name: true, location: true } },
    },
  })

  if (!po) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true, data: po })
}
