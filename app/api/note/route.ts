import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

type RouteContext = { params: { leadId: string } | Promise<{ leadId: string }> }

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

async function resolveLeadId(context: RouteContext): Promise<string | null> {
  const resolvedParams = await context.params
  const leadId = resolvedParams?.leadId

  if (typeof leadId !== 'string') return null

  const trimmed = leadId.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toPositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

// GET /api/note/[leadId] - Get notes for a specific lead
export async function GET(request: NextRequest, context: RouteContext) {
  const leadId = await resolveLeadId(context)

  if (!leadId) {
    return NextResponse.json({ success: false, error: 'Invalid lead id' }, { status: 400 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = toPositiveInt(searchParams.get('page'), DEFAULT_PAGE)
    const parsedLimit = toPositiveInt(searchParams.get('limit'), DEFAULT_LIMIT)
    const limit = Math.min(parsedLimit, MAX_LIMIT)
    const skip = (page - 1) * limit

    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } })
    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 })
    }

    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where: { leadId },
        include: {
          lead: {
            select: { id: true, name: true, email: true },
          },
          user: {
            select: { id: true, fullName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.note.count({ where: { leadId } }),
    ])

    return NextResponse.json({
      success: true,
      data: notes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: unknown) {
    console.error('Error fetching lead notes:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch lead notes',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// POST /api/note/[leadId] - Create a note for a specific lead
export async function POST(request: NextRequest, context: RouteContext) {
  const leadId = await resolveLeadId(context)

  if (!leadId) {
    return NextResponse.json({ success: false, error: 'Invalid lead id' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
    const content = typeof body.content === 'string' ? body.content.trim() : ''

    if (!userId || !content) {
      return NextResponse.json(
        { success: false, error: 'userId and content are required' },
        { status: 400 }
      )
    }

    const [lead, user] = await Promise.all([
      prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
    ])

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 })
    }

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const note = await prisma.note.create({
      data: {
        leadId,
        userId,
        content,
      },
      include: {
        lead: {
          select: { id: true, name: true, email: true },
        },
        user: {
          select: { id: true, fullName: true, email: true },
        },
      },
    })

    return NextResponse.json(
      { success: true, data: note, message: 'Note created successfully' },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error('Error creating note:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create note',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}