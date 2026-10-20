import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getConveyanceActor, isConveyanceAccounts } from '@/lib/conveyance'

export const runtime = 'nodejs'
export const preferredRegion = 'sin1'

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const actor = await getConveyanceActor()
  if (!actor) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (!isConveyanceAccounts(actor)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  const { id } = await context.params
  const body = await request.json().catch(() => null)
  const status = body?.status
  const note = typeof body?.accountsNote === 'string' ? body.accountsNote.trim().slice(0, 500) : null
  if (!['APPROVED', 'REJECTED', 'PAID'].includes(status)) return NextResponse.json({ success: false, error: 'Invalid status.' }, { status: 400 })
  const current = await prisma.conveyanceRequest.findUnique({ where: { id } })
  if (!current) return NextResponse.json({ success: false, error: 'Request not found.' }, { status: 404 })
  if (status === 'PAID' && current.status !== 'APPROVED') return NextResponse.json({ success: false, error: 'Only approved requests can be marked paid.' }, { status: 409 })
  if (['APPROVED', 'REJECTED'].includes(status) && current.status !== 'PENDING') return NextResponse.json({ success: false, error: 'This request has already been reviewed.' }, { status: 409 })
  const amount = current.amount
  const voucherNo = typeof body?.voucherNo === 'string' ? body.voucherNo.trim() || null : current.voucherNo
  if (status === 'APPROVED' && voucherNo?.length && voucherNo.length > 80) return NextResponse.json({ success: false, error: 'Voucher number is too long.' }, { status: 400 })
  try {
    const assignedVoucher = status === 'APPROVED' && !voucherNo
      ? `CV-${current.createdAt.toISOString().slice(0, 10).replaceAll('-', '')}-${id.slice(-6).toUpperCase()}`
      : voucherNo
    const updated = await prisma.conveyanceRequest.update({ where: { id }, data: {
      status,
      ...(status === 'APPROVED' ? { approvedAmount: amount, voucherNo: assignedVoucher } : {}),
      ...(status === 'REJECTED' ? { approvedAmount: 0 } : {}),
      ...(note !== null ? { accountsNote: note } : {}),
      reviewedById: actor.id,
      reviewedAt: new Date(),
    } })
    return NextResponse.json({ success: true, request: updated })
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') return NextResponse.json({ success: false, error: 'That voucher number is already in use.' }, { status: 409 })
    throw error
  }
}
