import { NextRequest, NextResponse } from 'next/server'
import { LeadAssignmentDepartment } from '@/generated/prisma/client'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import {
  buildQuotationLeadWhere,
  canAccessQuotationDraft,
  canEditQuotationDraft,
} from '@/lib/quotation-auth'
import { calculateQuotationTotals, normalizeQuotationContent } from '@/lib/quotation-calculations'
import {
  applyQuotationTypeToContent,
  buildDefaultQuotationContent,
  DEFAULT_QUOTATION_TEMPLATE_KEY,
  getQuotationTemplate,
  listQuotationTemplates,
} from '@/lib/quotation-templates'
import { getMergedQuotationTemplates } from '@/lib/quotation-overrides'
import { buildDefaultShortQuotationContent } from '@/lib/short-quotation-default'
import {
  buildShortQuotationSummary,
  normalizeShortQuotationContent,
  todayShortQuotationDate,
} from '@/lib/short-quotation-calculations'
import {
  isDetailQuotationContent,
  isShortQuotationContent,
  resolveQuotationDocumentType,
  type QuotationStoredContent,
} from '@/lib/quotation-document'
import type {
  ShortQuotationContent,
  ShortQuotationFloor,
  ShortQuotationLine,
  ShortQuotationPackage,
  ShortQuotationRoom,
} from '@/lib/short-quotation-types'
import type {
  QuotationDraftContent,
  QuotationDraftPayload,
  QuotationFileType,
  QuotationArea,
  QuotationLineItem,
  QuotationSection,
} from '@/lib/quotation-types'

type RouteContext = { params: { id: string } | Promise<{ id: string }> }

type SaveQuotationDraftBody = {
  documentType?: unknown
  quotationType?: unknown
  projectSqft?: unknown
  content?: unknown
  status?: unknown
}

async function resolveLeadId(context: RouteContext): Promise<string | null> {
  const resolvedParams = await context.params
  const id = resolvedParams?.id
  if (typeof id !== 'string') return null
  const trimmed = id.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toOptionalNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.trim().replace(/,/g, ''))
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function toQuotationType(value: unknown): QuotationFileType | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toUpperCase()
  if (normalized === 'PREMIUM' || normalized === 'STANDARD' || normalized === 'BASIC' || normalized === 'MIXED') {
    return normalized
  }
  return null
}

function toDraftStatus(value: unknown): 'DRAFT' | 'FINALIZED' | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toUpperCase()
  if (normalized === 'DRAFT' || normalized === 'FINALIZED') return normalized
  return null
}

function toRequestedDocumentType(value: unknown): 'short' | 'detail' | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  if (normalized === 'short' || normalized === 'detail') return normalized
  return null
}

function toShortQuotationPackage(value: unknown): ShortQuotationPackage | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toUpperCase()
  if (normalized === 'PLATINUM' || normalized === 'PREMIUM' || normalized === 'LUXURY') {
    return normalized
  }
  return null
}

function toShortQuotationLine(value: unknown): ShortQuotationLine | null {
  if (typeof value !== 'object' || value === null) return null
  const line = value as Record<string, unknown>
  if (typeof line.id !== 'string' || typeof line.name !== 'string') return null
  return {
    id: line.id,
    name: line.name,
    quantitySqft: toOptionalNumber(line.quantitySqft),
    unitPrice: toOptionalNumber(line.unitPrice),
    total: toOptionalNumber(line.total) ?? 0,
    isLumpSum: Boolean(line.isLumpSum),
  }
}

function toShortQuotationContent(value: unknown): ShortQuotationContent | null {
  if (!isShortQuotationContent(value)) return null
  const record = value as Record<string, unknown>
  const packageTier = toShortQuotationPackage(record.packageTier) ?? 'PREMIUM'

  const floors = Array.isArray(record.floors)
    ? record.floors
        .map((item) => {
          if (typeof item !== 'object' || item === null) return null
          const floor = item as Record<string, unknown>
          if (typeof floor.id !== 'string' || typeof floor.name !== 'string') return null
          return {
            id: floor.id,
            name: floor.name,
            sortOrder: typeof floor.sortOrder === 'number' ? floor.sortOrder : 0,
          } satisfies ShortQuotationFloor
        })
        .filter((item): item is ShortQuotationFloor => Boolean(item))
    : []

  const rooms = Array.isArray(record.rooms)
    ? record.rooms
        .map((item) => {
          if (typeof item !== 'object' || item === null) return null
          const room = item as Record<string, unknown>
          if (
            typeof room.id !== 'string' ||
            typeof room.floorId !== 'string' ||
            typeof room.name !== 'string'
          ) {
            return null
          }
          const lines = Array.isArray(room.lines)
            ? room.lines
                .map((line) => toShortQuotationLine(line))
                .filter((line): line is ShortQuotationLine => Boolean(line))
            : []
          return {
            id: room.id,
            floorId: room.floorId,
            name: room.name,
            sortOrder: typeof room.sortOrder === 'number' ? room.sortOrder : 0,
            lines,
          } satisfies ShortQuotationRoom
        })
        .filter((item): item is ShortQuotationRoom => Boolean(item))
    : []

  const footerNotes = Array.isArray(record.footerNotes)
    ? record.footerNotes.filter((note): note is string => typeof note === 'string')
    : []

  return {
    version: 1,
    documentType: 'short',
    packageTier,
    quotationDate: typeof record.quotationDate === 'string' ? record.quotationDate : '',
    quotationCode: typeof record.quotationCode === 'string' ? record.quotationCode : undefined,
    downloadedAt: typeof record.downloadedAt === 'string' ? record.downloadedAt : undefined,
    clientName: typeof record.clientName === 'string' ? record.clientName : '',
    clientAddress: typeof record.clientAddress === 'string' ? record.clientAddress : '',
    subject: typeof record.subject === 'string' ? record.subject : '',
    introLetter: typeof record.introLetter === 'string' ? record.introLetter : '',
    floors,
    rooms,
    footerNotes,
  }
}

function toDetailQuotationContent(value: unknown): QuotationDraftContent | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  if (!Array.isArray(record.sections) || !Array.isArray(record.lineItems)) return null

  const sections = record.sections
    .map((item) => {
      if (typeof item !== 'object' || item === null) return null
      const section = item as Record<string, unknown>
      if (typeof section.id !== 'string' || typeof section.name !== 'string') return null
      return {
        id: section.id,
        name: section.name,
        sortOrder: typeof section.sortOrder === 'number' ? section.sortOrder : 0,
      } satisfies QuotationSection
    })
    .filter((item): item is QuotationSection => Boolean(item))

  const areas = Array.isArray(record.areas)
    ? record.areas
        .map((item) => {
          if (typeof item !== 'object' || item === null) return null
          const area = item as Record<string, unknown>
          if (typeof area.id !== 'string' || typeof area.floorId !== 'string' || typeof area.name !== 'string') return null
          return {
            id: area.id,
            floorId: area.floorId,
            name: area.name,
            sortOrder: typeof area.sortOrder === 'number' ? area.sortOrder : 0,
          } satisfies QuotationArea
        })
        .filter((item): item is QuotationArea => Boolean(item))
    : []

  const lineItems = record.lineItems
    .map((item) => {
      if (typeof item !== 'object' || item === null) return null
      const line = item as Record<string, unknown>
      if (
        typeof line.id !== 'string' ||
        typeof line.sectionId !== 'string' ||
        typeof line.description !== 'string'
      ) {
        return null
      }
      const parsed: QuotationLineItem = {
        id: line.id,
        sectionId: line.sectionId,
        ...(typeof line.areaId === 'string' && line.areaId.trim() ? { areaId: line.areaId.trim() } : {}),
        description: line.description,
        unit:
          line.unit === 'sqft' ||
          line.unit === 'nos' ||
          line.unit === 'ls' ||
          line.unit === 'rmt' ||
          line.unit === 'rft'
            ? line.unit
            : 'sqft',
        rate: toOptionalNumber(line.rate) ?? 0,
        quantity: toOptionalNumber(line.quantity) ?? 0,
        amount: toOptionalNumber(line.amount) ?? 0,
        included: Boolean(line.included),
        isCustom: Boolean(line.isCustom),
      }
      if (typeof line.templateId === 'string' && line.templateId.trim()) {
        parsed.templateId = line.templateId.trim()
      }
      const serialNo = toOptionalNumber(line.serialNo)
      if (serialNo !== null) parsed.serialNo = serialNo
      if (typeof line.materials === 'string' && line.materials.trim()) {
        parsed.materials = line.materials
      }
      const rateMin = toOptionalNumber(line.rateMin)
      const rateMax = toOptionalNumber(line.rateMax)
      if (rateMin !== null) parsed.rateMin = rateMin
      if (rateMax !== null) parsed.rateMax = rateMax
      if (line.priceOnRequest === true) parsed.priceOnRequest = true
      if (typeof line.notes === 'string' && line.notes.trim()) {
        parsed.notes = line.notes
      }
      return parsed
    })
    .filter((item): item is QuotationLineItem => item !== null)

  const templateKey =
    typeof record.templateKey === 'string' && record.templateKey.trim()
      ? record.templateKey.trim()
      : DEFAULT_QUOTATION_TEMPLATE_KEY

  return {
    version: 1,
    documentType: 'detail',
    templateKey,
    sections,
    areas,
    lineItems,
    discountPercent: toOptionalNumber(record.discountPercent) ?? 0,
    discountAmount: toOptionalNumber(record.discountAmount) ?? 0,
    taxPercent: toOptionalNumber(record.taxPercent) ?? 0,
    notes: typeof record.notes === 'string' ? record.notes : '',
    terms:
      typeof record.terms === 'string' && record.terms.trim()
        ? record.terms
        : getQuotationTemplate(templateKey).defaultTerms,
    quotationDate: typeof record.quotationDate === 'string' ? record.quotationDate : undefined,
    quotationCode: typeof record.quotationCode === 'string' ? record.quotationCode : undefined,
    downloadedAt: typeof record.downloadedAt === 'string' ? record.downloadedAt : undefined,
    subject: typeof record.subject === 'string' ? record.subject : undefined,
    introLetter: typeof record.introLetter === 'string' ? record.introLetter : undefined,
    paymentTerms: typeof record.paymentTerms === 'string' ? record.paymentTerms : undefined,
    durationNotes: typeof record.durationNotes === 'string' ? record.durationNotes : undefined,
    drawingDesign: typeof record.drawingDesign === 'string' ? record.drawingDesign : undefined,
    signatoryName: typeof record.signatoryName === 'string' ? record.signatoryName : undefined,
    signatoryTitle: typeof record.signatoryTitle === 'string' ? record.signatoryTitle : undefined,
    summarySubject: typeof record.summarySubject === 'string' ? record.summarySubject : undefined,
  }
}

function parseStoredQuotationContent(value: unknown): QuotationStoredContent | null {
  const shortContent = toShortQuotationContent(value)
  if (shortContent) return shortContent
  return toDetailQuotationContent(value)
}

function buildDraftKey(documentType: 'short' | 'detail', packageTier?: ShortQuotationPackage | null) {
  if (documentType === 'detail') return 'detail'
  return `short:${(packageTier ?? 'PREMIUM').toLowerCase()}`
}

function buildOwnedDraftKey(baseDraftKey: string, ownerUserId: string) {
  return `${baseDraftKey}:owner:${ownerUserId}`
}

function matchesBaseDraftKey(draftKey: string, baseDraftKey: string) {
  return draftKey === baseDraftKey || draftKey.startsWith(`${baseDraftKey}:owner:`)
}

function serializeDraft(draft: {
  id: string
  draftKey?: string
  createdById?: string
  quotationType: string
  projectSqft: number | null
  content: unknown
  grandTotal: number
  status: 'DRAFT' | 'FINALIZED'
  createdAt: Date
  updatedAt: Date
}): QuotationDraftPayload & { id: string; createdAt: string; updatedAt: string } {
  return {
    id: draft.id,
    draftKey: draft.draftKey,
    createdById: draft.createdById,
    quotationType: draft.quotationType as QuotationFileType,
    projectSqft: draft.projectSqft,
    content: draft.content as QuotationDraftContent,
    grandTotal: draft.grandTotal,
    status: draft.status,
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
  }
}

function resolveTemplateKey(value: string | null): string {
  if (!value?.trim()) return DEFAULT_QUOTATION_TEMPLATE_KEY
  const template = getQuotationTemplate(value.trim())
  return template.key
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const leadId = await resolveLeadId(context)
    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Invalid lead id' }, { status: 400 })
    }

    const actorDepartments = authResult.actor.userDepartments ?? []
    if (!canAccessQuotationDraft(actorDepartments)) {
      return NextResponse.json(
        { success: false, error: 'Only quotation team, Senior CRM, or Admin can access quotation drafts' },
        { status: 403 },
      )
    }

    const leadWhere = buildQuotationLeadWhere({
      leadId,
      actorUserId: authResult.actorUserId,
      actorDepartments,
    })
    if (!leadWhere) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const lead = await prisma.lead.findFirst({
      where: leadWhere,
      select: {
        id: true,
        name: true,
        location: true,
        subStatus: true,
        visits: {
          orderBy: { scheduledAt: 'desc' },
          take: 1,
          select: { projectSqft: true },
        },
        assignments: {
          where: { department: LeadAssignmentDepartment.QUOTATION },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { userId: true },
        },
        quotationDrafts: {
          orderBy: { updatedAt: 'desc' },
        },
      },
    })

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found or not accessible' }, { status: 404 })
    }

    const assignedQuotationUserId = lead.assignments[0]?.userId ?? null
    const canEdit = canEditQuotationDraft({
      actorDepartments,
      actorUserId: authResult.actorUserId,
      leadSubStatus: lead.subStatus,
      assignedQuotationUserId,
    })

    const projectSqft = lead.visits[0]?.projectSqft ?? null
    const requestedTemplateKey = resolveTemplateKey(request.nextUrl.searchParams.get('templateKey'))
    const requestedDocumentType = toRequestedDocumentType(request.nextUrl.searchParams.get('documentType'))
    const requestedShortPackage = toShortQuotationPackage(request.nextUrl.searchParams.get('packageTier')) ?? 'PREMIUM'
    const requestedDraftKey = requestedDocumentType
      ? buildDraftKey(requestedDocumentType, requestedShortPackage)
      : null
    const savedDrafts = lead.quotationDrafts ?? []
    const selectedDraft = requestedDraftKey
      ? savedDrafts.find((draft) => draft.draftKey === buildOwnedDraftKey(requestedDraftKey, authResult.actorUserId))
        ?? savedDrafts.find((draft) => draft.draftKey === requestedDraftKey)
        ?? savedDrafts.find((draft) => matchesBaseDraftKey(draft.draftKey, requestedDraftKey))
        ?? null
      : savedDrafts[0] ?? null

    if (!selectedDraft) {
      const shortContent = buildDefaultShortQuotationContent({
        clientName: lead.name,
        clientAddress: lead.location,
        packageTier: requestedShortPackage,
      })
      const shortSummary = buildShortQuotationSummary(shortContent)
      const detailContent = buildDefaultQuotationContent({
        templateKey: requestedTemplateKey,
        quotationType: 'STANDARD',
        projectSqft,
      })
      const detailTotals = calculateQuotationTotals(detailContent)

      const mergedTemplates = await getMergedQuotationTemplates()

      return NextResponse.json({
        success: true,
        data: {
          draft: null,
          documentType: requestedDocumentType ?? ('short' as const),
          defaultDraft: {
            quotationType: requestedShortPackage as QuotationFileType,
            projectSqft,
            content: shortContent,
            grandTotal: shortSummary.grandTotal,
            status: 'DRAFT' as const,
          },
          defaultDetailDraft: {
            quotationType: 'STANDARD' as QuotationFileType,
            projectSqft,
            content: detailContent,
            grandTotal: detailTotals.grandTotal,
            status: 'DRAFT' as const,
          },
          templates: listQuotationTemplates(),
          fullTemplates: mergedTemplates,
          lead: {
            id: lead.id,
            name: lead.name,
            location: lead.location,
            subStatus: lead.subStatus,
            projectSqft,
          },
          canEdit,
        },
      })
    }

    const savedContent = selectedDraft.content
    const documentType = resolveQuotationDocumentType(savedContent)
    const mergedTemplates = await getMergedQuotationTemplates()

    return NextResponse.json({
      success: true,
      data: {
        draft: serializeDraft(selectedDraft),
        documentType,
        defaultDraft: null,
        templates: listQuotationTemplates(),
        fullTemplates: mergedTemplates,
        activeTemplate:
          documentType === 'detail' && isDetailQuotationContent(savedContent)
            ? getQuotationTemplate(savedContent.templateKey).key
            : null,
        lead: {
          id: lead.id,
          name: lead.name,
          location: lead.location,
          subStatus: lead.subStatus,
          projectSqft: selectedDraft.projectSqft ?? projectSqft,
        },
        canEdit,
      },
    })
  } catch (error) {
    console.error('[lead/:id/quotation-draft][GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load quotation draft' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const leadId = await resolveLeadId(context)
    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Invalid lead id' }, { status: 400 })
    }

    const body = (await request.json().catch(() => ({}))) as SaveQuotationDraftBody
    const quotationType = toQuotationType(body.quotationType) ?? 'STANDARD'
    const projectSqft = toOptionalNumber(body.projectSqft)
    const contentInput = parseStoredQuotationContent(body.content)
    const status = toDraftStatus(body.status) ?? 'DRAFT'

    if (!contentInput) {
      return NextResponse.json({ success: false, error: 'Invalid quotation content' }, { status: 400 })
    }

    const actorDepartments = authResult.actor.userDepartments ?? []
    if (!canAccessQuotationDraft(actorDepartments)) {
      return NextResponse.json(
        { success: false, error: 'Only quotation team, Senior CRM, or Admin can save quotation drafts' },
        { status: 403 },
      )
    }

    const leadWhere = buildQuotationLeadWhere({
      leadId,
      actorUserId: authResult.actorUserId,
      actorDepartments,
    })
    if (!leadWhere) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const lead = await prisma.lead.findFirst({
      where: leadWhere,
      select: {
        id: true,
        subStatus: true,
        visits: {
          orderBy: { scheduledAt: 'desc' },
          take: 1,
          select: { projectSqft: true },
        },
        assignments: {
          where: { department: LeadAssignmentDepartment.QUOTATION },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { userId: true },
        },
      },
    })

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found or not accessible' }, { status: 404 })
    }

    const assignedQuotationUserId = lead.assignments[0]?.userId ?? null
    const canEdit = canEditQuotationDraft({
      actorDepartments,
      actorUserId: authResult.actorUserId,
      leadSubStatus: lead.subStatus,
      assignedQuotationUserId,
    })

    if (!canEdit) {
      return NextResponse.json(
        {
          success: false,
          error: 'Quotation can only be edited while work is in progress on an assigned lead',
        },
        { status: 403 },
      )
    }

    const resolvedProjectSqft =
      projectSqft && projectSqft > 0 ? projectSqft : lead.visits[0]?.projectSqft ?? null

    const isShort = isShortQuotationContent(contentInput)
    const savedQuotationDate = todayShortQuotationDate()
    const calculatedContent = isShort
      ? normalizeShortQuotationContent(contentInput)
      : normalizeQuotationContent(
          applyQuotationTypeToContent(contentInput, quotationType),
        )
    const normalizedContent = {
      ...calculatedContent,
      quotationDate: savedQuotationDate,
    }
    const grandTotal = isShort
      ? buildShortQuotationSummary(normalizedContent as ShortQuotationContent).grandTotal
      : calculateQuotationTotals(normalizedContent as QuotationDraftContent).grandTotal
    const storedQuotationType = isShort
      ? (normalizedContent as ShortQuotationContent).packageTier
      : quotationType

    const documentType = isShort ? 'short' : 'detail'
    const requestedShortPackage = documentType === 'short' ? (normalizedContent as ShortQuotationContent).packageTier : null
    const baseDraftKey = buildDraftKey(documentType, requestedShortPackage)
    const draftKey = buildOwnedDraftKey(baseDraftKey, authResult.actorUserId)

    const savedDraft = await prisma.quotationDraft.upsert({
      where: { leadId_draftKey: { leadId: lead.id, draftKey } },
      create: {
        leadId: lead.id,
        draftKey,
        createdById: authResult.actorUserId,
        updatedById: authResult.actorUserId,
        quotationType: storedQuotationType,
        projectSqft: resolvedProjectSqft,
        content: normalizedContent,
        grandTotal,
        status,
      },
      update: {
        updatedById: authResult.actorUserId,
        quotationType: storedQuotationType,
        projectSqft: resolvedProjectSqft,
        content: normalizedContent,
        grandTotal,
        status,
      },
    })

    return NextResponse.json({
      success: true,
      data: serializeDraft(savedDraft),
      message: 'Quotation draft saved',
    })
  } catch (error) {
    console.error('[lead/:id/quotation-draft][PUT] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to save quotation draft' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { Allow: 'GET, PUT, OPTIONS' } })
}
