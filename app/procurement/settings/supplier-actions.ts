'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export type CreateSupplierInput = {
  name: string
  companyName?: string
  phone?: string
  email?: string
  address?: string
  supplyCategory?: string
  bankName?: string
  bankAccountNumber?: string
  routingNumber?: string
  notes?: string
}

export type UpdateSupplierInput = CreateSupplierInput & {
  id: string
  status?: 'ACTIVE' | 'INACTIVE'
}

export async function getSuppliersAction() {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, suppliers }
  } catch (error: any) {
    console.error('Error fetching suppliers:', error)
    return { success: false, error: error.message || 'Failed to fetch suppliers', suppliers: [] }
  }
}

export async function createSupplierAction(data: CreateSupplierInput) {
  try {
    if (!data.name || !data.name.trim()) {
      return { success: false, error: 'Contact person or trade name is required' }
    }

    // Generate unique supplierCode: SUP-0001-XYZ
    const count = await prisma.supplier.count()
    const randSuffix = Math.random().toString(36).substring(2, 5).toUpperCase()
    const supplierCode = `SUP-${(count + 1).toString().padStart(4, '0')}-${randSuffix}`

    const newSupplier = await prisma.supplier.create({
      data: {
        supplierCode,
        name: data.name.trim(),
        companyName: data.companyName?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
        supplyCategory: data.supplyCategory?.trim() || null,
        bankName: data.bankName?.trim() || null,
        bankAccountNumber: data.bankAccountNumber?.trim() || null,
        routingNumber: data.routingNumber?.trim() || null,
        notes: data.notes?.trim() || null,
        status: 'ACTIVE',
      },
    })

    revalidatePath('/procurement/settings')
    revalidatePath('/procurement/billing-center')
    return { success: true, supplier: newSupplier }
  } catch (error: any) {
    console.error('Error creating supplier:', error)
    return { success: false, error: error.message || 'Failed to create supplier' }
  }
}

export async function updateSupplierAction(data: UpdateSupplierInput) {
  try {
    if (!data.id) return { success: false, error: 'Supplier ID is required' }
    if (!data.name || !data.name.trim()) {
      return { success: false, error: 'Contact person or trade name is required' }
    }

    const updated = await prisma.supplier.update({
      where: { id: data.id },
      data: {
        name: data.name.trim(),
        companyName: data.companyName?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
        supplyCategory: data.supplyCategory?.trim() || null,
        bankName: data.bankName?.trim() || null,
        bankAccountNumber: data.bankAccountNumber?.trim() || null,
        routingNumber: data.routingNumber?.trim() || null,
        notes: data.notes?.trim() || null,
        ...(data.status ? { status: data.status } : {}),
      },
    })

    revalidatePath('/procurement/settings')
    revalidatePath('/procurement/billing-center')
    return { success: true, supplier: updated }
  } catch (error: any) {
    console.error('Error updating supplier:', error)
    return { success: false, error: error.message || 'Failed to update supplier' }
  }
}

export async function toggleSupplierStatusAction(id: string, currentStatus: 'ACTIVE' | 'INACTIVE') {
  try {
    const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    const updated = await prisma.supplier.update({
      where: { id },
      data: { status: nextStatus },
    })

    revalidatePath('/procurement/settings')
    revalidatePath('/procurement/billing-center')
    return { success: true, supplier: updated }
  } catch (error: any) {
    console.error('Error toggling supplier status:', error)
    return { success: false, error: error.message || 'Failed to toggle supplier status' }
  }
}

export async function deleteSupplierAction(id: string) {
  try {
    await prisma.supplier.delete({
      where: { id },
    })

    revalidatePath('/procurement/settings')
    revalidatePath('/procurement/billing-center')
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting supplier:', error)
    return { success: false, error: error.message || 'Failed to delete supplier' }
  }
}
