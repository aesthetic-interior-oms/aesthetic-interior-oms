import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET /api/note/[leadId] - Get all notes for a specific lead
export async function GET(
  request: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    const { leadId } = params

    if (!leadId || leadId.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Lead ID is required' },
        { status: 400 }
      )
    }

    // Check if lead exists
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true }
    })

    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      )
    }

    // Get all notes for this lead
    const notes = await prisma.note.findMany({
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
    })

    return NextResponse.json({
      success: true,
      data: notes,
      total: notes.length,
    })
  } catch (error) {
    console.error('Error fetching lead notes:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lead notes' },
      { status: 500 }
    )
  }
}
