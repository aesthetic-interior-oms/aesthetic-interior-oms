import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

type RouteContext = { params: { leadId: string } | Promise<{ leadId: string }> };

async function resolveLeadId(context: RouteContext): Promise<string | null> {
  const resolvedParams = await context.params;
  const leadId = resolvedParams?.leadId?.trim() || null;
  return leadId && leadId.length > 0 ? leadId : null;
}

// GET /api/followup/[leadId] - Get all follow-ups for a specific lead
export async function GET(_request: NextRequest, context: RouteContext) {
  const leadId = await resolveLeadId(context);
  if (!leadId) {
    return NextResponse.json({ success: false, error: 'Invalid lead id' }, { status: 400 });
  }

  try {
    // Verify that the lead exists
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }

    // Fetch all follow-ups for this lead
    const followUps = await prisma.followUp.findMany({
      where: { leadId },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            location: true,
          },
        },
        assignedTo: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { followupDate: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: followUps,
      count: followUps.length,
    });
  } catch (error: any) {
    console.error('Error fetching follow-ups for lead:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch follow-ups', message: error.message },
      { status: 500 }
    );
  }
}

// POST /api/followup/[leadId] - Create a new follow-up for a specific lead
export async function POST(request: NextRequest, context: RouteContext) {
  const leadId = await resolveLeadId(context);
  if (!leadId) {
    return NextResponse.json({ success: false, error: 'Invalid lead id' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const {
      assignedToId,
      followupDate,
      notes,
      userId, // User creating the follow-up (for activity log)
    } = body;

    // Validation
    if (!assignedToId || !followupDate) {
      return NextResponse.json(
        { success: false, error: 'Assigned user and follow-up date are required' },
        { status: 400 }
      );
    }

    // Check if lead exists
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }

    // Check if assigned user exists
    const user = await prisma.user.findUnique({
      where: { id: assignedToId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Assigned user not found' },
        { status: 404 }
      );
    }

    // Create follow-up with transaction to log activity
    const followUp = await prisma.$transaction(async (tx) => {
      const newFollowUp = await tx.followUp.create({
        data: {
          leadId,
          assignedToId,
          followupDate: new Date(followupDate),
          notes,
        },
        include: {
          lead: {
            select: { id: true, name: true, email: true },
          },
          assignedTo: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });

      // Log activity if userId is provided
      if (userId) {
        await tx.activityLog.create({
          data: {
            leadId,
            userId,
            type: 'FOLLOW_UP_SCHEDULED',
            description: `Follow-up scheduled for ${new Date(followupDate).toLocaleDateString()}`,
          },
        });
      }

      return newFollowUp;
    });

    return NextResponse.json(
      { success: true, data: followUp, message: 'Follow-up created successfully' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating follow-up:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create follow-up', message: error.message },
      { status: 500 }
    );
  }
}
