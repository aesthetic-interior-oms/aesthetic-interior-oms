import prisma from '@/lib/prisma';
import { ActivityType, FollowUpStatus, Prisma } from '@/generated/prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

type RouteContext = { params: { leadId: string; id: string } | Promise<{ leadId: string; id: string }> };
const completedFollowUpStatuses: FollowUpStatus[] = [FollowUpStatus.DONE, FollowUpStatus.LATELY_DONE];

async function resolveParams(context: RouteContext): Promise<{ leadId: string | null; id: string | null }> {
  const resolvedParams = await context.params;
  const leadId = resolvedParams?.leadId?.trim() || null;
  const id = resolvedParams?.id?.trim() || null;
  
  return {
    leadId: leadId && leadId.length > 0 ? leadId : null,
    id: id && id.length > 0 ? id : null,
  };
}


async function resolveActivityUserId(requestedUserId: unknown): Promise<string | null> {
  const normalizedRequested = typeof requestedUserId === 'string' ? requestedUserId.trim() : ''

  if (normalizedRequested) {
    const requestedMatch = await prisma.user.findFirst({
      where: {
        OR: [{ id: normalizedRequested }, { clerkUserId: normalizedRequested }],
      },
      select: { id: true },
    })

    if (requestedMatch?.id) {
      return requestedMatch.id
    }
  }

  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) return null

  const authenticatedUser = await prisma.user.findUnique({
    where: { clerkUserId },
    select: { id: true },
  })

  return authenticatedUser?.id ?? null
}

// GET /api/followup/[leadId]/[id] - Get a single follow-up by ID
export async function GET(_request: NextRequest, context: RouteContext) {
  const { leadId, id } = await resolveParams(context);
  if (!id || !leadId) {
    return NextResponse.json({ success: false, error: 'Invalid lead id or follow-up id' }, { status: 400 });
  }

  try {
    const followUp = await prisma.followUp.findUnique({
      where: { id },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            location: true,
          },
        },
        assignedTo: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    if (!followUp) {
      return NextResponse.json(
        { success: false, error: 'Follow-up not found' },
        { status: 404 }
      );
    }

    // Verify that the follow-up belongs to the specified lead
    if (followUp.leadId !== leadId) {
      return NextResponse.json(
        { success: false, error: 'Follow-up does not belong to the specified lead' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: followUp });
  } catch (error: unknown) {
    console.error('Error fetching follow-up:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch follow-up', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT /api/followup/[leadId]/[id] - Update a follow-up
export async function PUT(request: NextRequest, context: RouteContext) {
  const { leadId, id } = await resolveParams(context);
  if (!id || !leadId) {
    return NextResponse.json({ success: false, error: 'Invalid lead id or follow-up id' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const {
      assignedToId,
      followupDate,
      status,
      notes,
      userId, // User updating the follow-up (for activity log)
    } = body
    const activityUserId = await resolveActivityUserId(userId)

    // Check if follow-up exists
    const existingFollowUp = await prisma.followUp.findUnique({ where: { id } });
    if (!existingFollowUp) {
      return NextResponse.json(
        { success: false, error: 'Follow-up not found' },
        { status: 404 }
      );
    }

    // Verify that the follow-up belongs to the specified lead
    if (existingFollowUp.leadId !== leadId) {
      return NextResponse.json(
        { success: false, error: 'Follow-up does not belong to the specified lead' },
        { status: 403 }
      );
    }

    // Validate assigned user if provided
    if (assignedToId) {
      const user = await prisma.user.findUnique({ where: { id: assignedToId } });
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Assigned user not found' },
          { status: 404 }
        );
      }
    }

    // Update follow-up with transaction to log activity
    const followUp = await prisma.$transaction(async (tx) => {
      const updatedFollowUp = await tx.followUp.update({
        where: { id },
        data: {
          ...(assignedToId !== undefined ? { assignedToId } : {}),
          ...(followupDate !== undefined ? { followupDate: new Date(followupDate) } : {}),
          ...(status !== undefined ? { status: status as FollowUpStatus } : {}),
          ...(notes !== undefined ? { notes } : {}),
        },
        include: {
          lead: {
            select: { id: true, name: true, email: true },
          },
          assignedTo: {
            select: { id: true, fullName: true, email: true },
          },
        },
      })

      // Log activity when follow-up is completed
      if (
        status !== undefined &&
        completedFollowUpStatuses.includes(status as FollowUpStatus) &&
        !completedFollowUpStatuses.includes(existingFollowUp.status) &&
        activityUserId
      ) {
        await tx.activityLog.create({
          data: {
            leadId: existingFollowUp.leadId,
            userId: activityUserId,
            type: ActivityType.FOLLOWUP_COMPLETED,
            description: `Follow-up marked as ${(status as FollowUpStatus).toLowerCase()}`,
          },
        })
      }

      return updatedFollowUp
    })

    return NextResponse.json({
      success: true,
      data: followUp,
      message: 'Follow-up updated successfully',
    })
  } catch (error: unknown) {
    console.error('Error updating follow-up:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update follow-up', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PATCH /api/followup/[leadId]/[id] - Partial update a follow-up
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { leadId, id } = await resolveParams(context);
  if (!id || !leadId) {
    return NextResponse.json({ success: false, error: 'Invalid lead id or follow-up id' }, { status: 400 });
  }

  try {
    const body = await request.json()
    const activityUserId = await resolveActivityUserId(body.userId)

    // Check if follow-up exists
    const existingFollowUp = await prisma.followUp.findUnique({ where: { id } })
    if (!existingFollowUp) {
      return NextResponse.json(
        { success: false, error: 'Follow-up not found' },
        { status: 404 }
      )
    }

    // Verify that the follow-up belongs to the specified lead
    if (existingFollowUp.leadId !== leadId) {
      return NextResponse.json(
        { success: false, error: 'Follow-up does not belong to the specified lead' },
        { status: 403 }
      )
    }

    // Prepare update data
    const updateData: Prisma.FollowUpUncheckedUpdateInput = {}
    if (body.assignedToId !== undefined) updateData.assignedToId = body.assignedToId
    if (body.followupDate !== undefined) updateData.followupDate = new Date(body.followupDate)
    if (body.status !== undefined) updateData.status = body.status
    if (body.notes !== undefined) updateData.notes = body.notes

    const followUp = await prisma.$transaction(async (tx) => {
      const updatedFollowUp = await tx.followUp.update({
        where: { id },
        data: updateData,
        include: {
          lead: {
            select: { id: true, name: true, email: true },
          },
          assignedTo: {
            select: { id: true, fullName: true, email: true },
          },
        },
      })

      const nextStatus = body.status as FollowUpStatus | undefined
      if (
        nextStatus !== undefined &&
        completedFollowUpStatuses.includes(nextStatus) &&
        !completedFollowUpStatuses.includes(existingFollowUp.status) &&
        activityUserId
      ) {
        await tx.activityLog.create({
          data: {
            leadId: existingFollowUp.leadId,
            userId: activityUserId,
            type: ActivityType.FOLLOWUP_COMPLETED,
            description: `Follow-up marked as ${nextStatus.toLowerCase()}`,
          },
        })
      }

      return updatedFollowUp
    })

    return NextResponse.json({
      success: true,
      data: followUp,
      message: 'Follow-up updated successfully',
    })
  } catch (error: unknown) {
    console.error('Error updating follow-up:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update follow-up', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE /api/followup/[leadId]/[id] - Delete a follow-up
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { leadId, id } = await resolveParams(context);
  if (!id || !leadId) {
    return NextResponse.json({ success: false, error: 'Invalid lead id or follow-up id' }, { status: 400 });
  }

  try {
    // Check if follow-up exists
    const existingFollowUp = await prisma.followUp.findUnique({ where: { id } });
    if (!existingFollowUp) {
      return NextResponse.json(
        { success: false, error: 'Follow-up not found' },
        { status: 404 }
      );
    }

    // Verify that the follow-up belongs to the specified lead
    if (existingFollowUp.leadId !== leadId) {
      return NextResponse.json(
        { success: false, error: 'Follow-up does not belong to the specified lead' },
        { status: 403 }
      );
    }

    await prisma.followUp.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      message: 'Follow-up deleted successfully',
    })
  } catch (error: unknown) {
    console.error('Error deleting follow-up:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete follow-up', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
