import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { normalizeDepartmentName } from '@/lib/department-normalization'
import { hasBoqLeaderRole, hasBoqMemberRole } from '@/lib/boq-roles'
import { hasProcurementRole, hasProcurementLeaderRole } from '@/lib/procurement-roles'
import { canViewPO } from '@/lib/purchase-order'
import ProductionHubClient from './_components/production-hub-client'

export const runtime = 'nodejs'
export const revalidate = 0

interface ProductionHubPageProps {
  params: Promise<{ leadId: string }>
}

export default async function ProductionHubPage({ params }: ProductionHubPageProps) {
  const { leadId } = await params
  const { userId } = await auth()
  if (!userId) redirect('/')

  const dbUser = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      id: true,
      userDepartments: { select: { department: { select: { name: true } } } },
      userRoles: { select: { role: { select: { name: true } } } },
    },
  })

  if (!dbUser) redirect('/onboarding')

  const deptNames = dbUser.userDepartments
    .map((r) => normalizeDepartmentName(r.department.name))
    .filter((d): d is string => Boolean(d))
  const roleNames = dbUser.userRoles.map((r) => r.role.name.trim().toUpperCase().replace(/\s+/g, '_'))

  const isAdmin = deptNames.includes('ADMIN') || roleNames.includes('ADMIN')
  const isPC =
    deptNames.includes('PROJECT_COORDINATOR') ||
    deptNames.includes('PROJECT_CORDINATOR') ||
    roleNames.includes('PROJECT_COORDINATOR')
  const isAccounts = deptNames.includes('ACCOUNTS') || deptNames.includes('FINANCE')
  const isBOQLeader = hasBoqLeaderRole(roleNames)
  const isBOQMember = hasBoqMemberRole(roleNames)
  const isProcurement = hasProcurementRole(roleNames, deptNames)
  const isProcurementLeader = hasProcurementLeaderRole(roleNames) || isAdmin
  const isSiteEngineer = deptNames.includes('SITE_ENGINEER')

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      assignments: {
        include: {
          user: { select: { id: true, fullName: true, phone: true } },
        },
      },
      materialRequisitions: {
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { fullName: true } },
          procurementAssignee: { select: { id: true, fullName: true } },
          _count: { select: { items: true } },
          indents: {
            orderBy: { createdAt: 'desc' },
            include: {
              createdBy: { select: { fullName: true } },
              purchaseOrder: {
                include: {
                  createdBy: { select: { fullName: true } },
                  approvedBy: { select: { fullName: true } },
                  rejectedBy: { select: { fullName: true } },
                },
              },
            },
          },
        },
      },
      siteDeliveryLogs: {
        orderBy: { deliveryDate: 'desc' },
        take: 30,
        include: {
          receivedBy: { select: { fullName: true } },
        },
      },
      vendorAgreements: {
        where: { workCategory: 'CEILING' },
        include: {
          vendor: { select: { vendorName: true, vendorCompanyName: true } },
          createdBy: { select: { fullName: true } },
        },
      },
    },
  })

  if (!lead) notFound()

  // Format data for client component
  const hubData = {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    location: lead.location,
    stage: lead.stage,
    agreementValue: lead.agreementValue,
    agreementType: lead.agreementType,
    assignments: lead.assignments.map((a) => ({
      department: a.department,
      user: { fullName: a.user.fullName, phone: a.user.phone },
    })),
    materialRequisitions: lead.materialRequisitions.map((req) => ({
      id: req.id,
      requisitionNo: req.requisitionNo,
      status: req.status,
      notes: req.notes,
      createdAt: req.createdAt.toISOString(),
      createdBy: { fullName: req.createdBy.fullName },
      procurementAssignee: req.procurementAssignee
        ? { id: req.procurementAssignee.id, fullName: req.procurementAssignee.fullName }
        : null,
      _count: req._count,
      indents: req.indents.map((indent) => ({
        id: indent.id,
        indentNo: indent.indentNo,
        vendorName: indent.vendorName,
        total: Number(indent.total),
        transportCost: Number(indent.transportCost),
        otherCosts: Number(indent.otherCosts),
        notes: indent.notes,
        createdAt: indent.createdAt.toISOString(),
        createdBy: { fullName: indent.createdBy.fullName },
        purchaseOrder: indent.purchaseOrder
          ? {
              id: indent.purchaseOrder.id,
              poNo: indent.purchaseOrder.poNo,
              status: indent.purchaseOrder.status,
              totalAmount: indent.purchaseOrder.totalAmount,
              supplierName: indent.purchaseOrder.supplierName,
              notes: indent.purchaseOrder.notes,
              accountsNote: indent.purchaseOrder.accountsNote,
              rejectionReason: indent.purchaseOrder.rejectionReason,
              createdAt: indent.purchaseOrder.createdAt.toISOString(),
              approvedAt: indent.purchaseOrder.approvedAt ? indent.purchaseOrder.approvedAt.toISOString() : null,
              createdBy: { fullName: indent.purchaseOrder.createdBy.fullName },
              approvedBy: indent.purchaseOrder.approvedBy ? { fullName: indent.purchaseOrder.approvedBy.fullName } : null,
              rejectedBy: indent.purchaseOrder.rejectedBy ? { fullName: indent.purchaseOrder.rejectedBy.fullName } : null,
            }
          : null,
      })),
    })),
    siteDeliveryLogs: lead.siteDeliveryLogs.map((log) => ({
      id: log.id,
      challanNo: log.challanNo,
      vendorName: log.vendorName,
      itemsSummary: log.itemsSummary,
      quantity: log.quantity,
      unit: log.unit,
      deliveryDate: log.deliveryDate.toISOString(),
      condition: log.condition,
      receivedBy: { fullName: log.receivedBy.fullName },
    })),
    vendorAgreements: lead.vendorAgreements.map((va) => ({
      id: va.id,
      workOrderNo: va.workOrderNo,
      agreementValue: va.agreementValue,
      workStatus: va.workStatus,
      workScope: va.workScope,
      notes: va.notes,
      vendor: va.vendor
        ? {
            vendorName: va.vendor.vendorName,
            vendorCompanyName: va.vendor.vendorCompanyName,
          }
        : null,
      createdBy: va.createdBy ? { fullName: va.createdBy.fullName } : null,
    })),
  }

  const permissions = {
    isAccounts,
    isBOQLeader,
    isBOQMember,
    isPC,
    isProcurement,
    isProcurementLeader,
    isSiteEngineer,
    isAdmin,
    currentUserId: dbUser.id,
    canViewPO: canViewPO(roleNames, deptNames),
  }

  return <ProductionHubClient data={hubData} leadId={lead.id} permissions={permissions} />
}
