import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'
import { normalizeDepartmentName } from '@/lib/department-normalization'
import { calculateQuotationTotals, normalizeQuotationContent } from '@/lib/quotation-calculations'
import type { QuotationDraftContent, QuotationLineItem } from '@/lib/quotation-types'

export const runtime = 'nodejs'

function isBaselineDraft(draftKey: string): boolean {
  if (!draftKey) return true
  if (draftKey === 'detail' || draftKey === 'detail:slot:1' || draftKey === 'pc:slot:1' || draftKey.startsWith('short:')) {
    return true
  }
  return false
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const { id: leadId } = await params
    const body = await req.json().catch(() => ({}))
    const { sourceDraftId, lineItemPatches } = body as {
      sourceDraftId?: string
      lineItemPatches?: Array<{ id: string; quantity?: number; included?: boolean }>
    }

    // Check department access
    const userDepts = await prisma.userDepartment.findMany({
      where: { userId: user.id },
      select: { department: { select: { name: true } } },
    })
    const deptNames = new Set(
      userDepts
        .map((d) => normalizeDepartmentName(d.department.name))
        .filter((name): name is string => Boolean(name)),
    )

    const isAdmin = deptNames.has('ADMIN')
    const isPc = deptNames.has('PROJECT_COORDINATOR')

    if (!isAdmin && !isPc) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    if (isPc && !isAdmin) {
      const assignment = await prisma.leadAssignment.findFirst({
        where: {
          leadId,
          userId: user.id,
          department: 'PROJECT_COORDINATOR',
        },
      })
      if (!assignment) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
      }
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        quotationDrafts: {
          orderBy: { updatedAt: 'desc' },
        },
      },
    })

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Project lead not found' }, { status: 404 })
    }

    // Find source draft or fallback to latest draft
    const sourceDraft = sourceDraftId
      ? lead.quotationDrafts.find((d) => d.id === sourceDraftId)
      : lead.quotationDrafts[0]

    if (!sourceDraft || !sourceDraft.content) {
      return NextResponse.json({ success: false, error: 'No base quotation draft available' }, { status: 400 })
    }

    // Determine next version slot index
    const existingPcSlots = lead.quotationDrafts
      .map((d) => {
        if (d.draftKey.startsWith('pc:slot:')) {
          const s = parseInt(d.draftKey.replace('pc:slot:', ''), 10)
          return Number.isFinite(s) ? s : 1
        }
        return 1
      })
      .filter((s) => s > 1)

    const nextSlot = existingPcSlots.length > 0 ? Math.max(...existingPcSlots) + 1 : 2
    const draftKey = `pc:slot:${nextSlot}`
    const versionTitle = `Version ${nextSlot}`

    const rawContent = (sourceDraft.content as Record<string, unknown>) ?? {}
    const rawLines = Array.isArray(rawContent.lineItems) ? (rawContent.lineItems as QuotationLineItem[]) : []

    const patchMap = new Map<string, { quantity?: number; included?: boolean }>()
    if (Array.isArray(lineItemPatches)) {
      lineItemPatches.forEach((p) => {
        if (p.id) patchMap.set(p.id, p)
      })
    }

    const updatedLines = rawLines.map((line) => {
      const p = patchMap.get(line.id)
      if (!p) return line

      const nextQty = typeof p.quantity === 'number' && p.quantity >= 0 ? p.quantity : line.quantity
      const nextIncluded = typeof p.included === 'boolean' ? p.included : line.included
      const isPackage = line.unit === 'ls'
      const nextAmount = isPackage
        ? line.amount
        : (line.rate ?? 0) * (nextQty ?? 0)

      return {
        ...line,
        quantity: nextQty,
        included: nextIncluded,
        amount: nextAmount,
      }
    })

    const newContentObj: QuotationDraftContent = {
      ...(rawContent as unknown as QuotationDraftContent),
      lineItems: updatedLines,
      versionTitle,
    }

    const normalizedContent = normalizeQuotationContent(newContentObj)
    const totals = calculateQuotationTotals(normalizedContent)

    const newDraft = await prisma.quotationDraft.create({
      data: {
        leadId,
        draftKey,
        createdById: user.id,
        updatedById: user.id,
        quotationType: sourceDraft.quotationType || 'STANDARD',
        projectSqft: sourceDraft.projectSqft,
        content: normalizedContent as any,
        grandTotal: totals.grandTotal,
        status: 'DRAFT',
      },
    })

    if (totals.grandTotal > 0) {
      await prisma.lead.update({
        where: { id: leadId },
        data: { budget: totals.grandTotal },
      }).catch(console.error)
    }

    return NextResponse.json({
      success: true,
      data: {
        id: newDraft.id,
        draftKey: newDraft.draftKey,
        versionTitle,
        grandTotal: newDraft.grandTotal,
        content: newDraft.content,
      },
      message: `Created new quotation version: ${versionTitle}`,
    })
  } catch (error) {
    console.error('[api/pc/projects/[id]/versions][POST] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create quotation version' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const { id: leadId } = await params
    const url = new URL(req.url)
    const draftId = url.searchParams.get('draftId')

    if (!draftId) {
      return NextResponse.json({ success: false, error: 'draftId query parameter is required' }, { status: 400 })
    }

    // Check department access
    const userDepts = await prisma.userDepartment.findMany({
      where: { userId: user.id },
      select: { department: { select: { name: true } } },
    })
    const deptNames = new Set(
      userDepts
        .map((d) => normalizeDepartmentName(d.department.name))
        .filter((name): name is string => Boolean(name)),
    )

    const isAdmin = deptNames.has('ADMIN')
    const isPc = deptNames.has('PROJECT_COORDINATOR')

    if (!isAdmin && !isPc) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const draft = await prisma.quotationDraft.findFirst({
      where: { id: draftId, leadId },
    })

    if (!draft) {
      return NextResponse.json({ success: false, error: 'Quotation version not found' }, { status: 404 })
    }

    // Baseline protection: Version 1 (original agreement baseline) CANNOT be deleted
    if (isBaselineDraft(draft.draftKey)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Version 1 (Original Agreement baseline) is locked and cannot be deleted.',
        },
        { status: 403 },
      )
    }

    await prisma.quotationDraft.delete({
      where: { id: draft.id },
    })

    return NextResponse.json({
      success: true,
      message: 'Quotation version deleted successfully',
    })
  } catch (error) {
    console.error('[api/pc/projects/[id]/versions][DELETE] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete quotation version' }, { status: 500 })
  }
}
