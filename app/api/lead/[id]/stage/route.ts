import prisma from '@/lib/prisma';
import { LeadStage, LeadSubStatus, LeadAssignmentDepartment, Prisma } from '@/generated/prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { sendPushToUser } from '@/lib/fcm-service';
import { isSubStatusAllowedForStage } from '@/lib/lead-stage';
import { logLeadStageChanged, logLeadSubStatusChanged } from '@/lib/activity-log-service';
import { requireDatabaseRoles } from '@/lib/authz';
import { autoCompletePendingFollowups } from '@/lib/followup-auto-complete';
import {
  canManagePaymentStatus,
  ensureDepartmentAssignment,
  ensureSeniorCrmAssignment,
  handoffDepartmentForSubStatus,
  requiresSrCrmAssignment,
} from '@/lib/lead-handoff';
import { buildScopedLeadWhere } from '@/lib/lead-access';
import { canManagePrimaryLeadFlow } from '@/lib/lead-workflow-auth';
import { ensurePhaseTaskForSubStatus } from '@/lib/lead-phase-task';
import { createSrCadReviewTodosForCadStart } from '@/lib/sr-cad-todo';
import { hasJrArchitectureLeaderRole } from '@/lib/jr-architecture-roles';
import { processAgreementAndDiscountSync } from '@/lib/agreement-discount-sync';

type RouteContext = { params: { id: string } | Promise<{ id: string }> };

const debugLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== 'production') {
    void args;
    // console.log(...args);
  }
};

type UpdateLeadStageBody = {
  stage?: unknown;
  subStatus?: unknown;
  reason?: unknown;
  jrArchitectUserId?: unknown;
  quotationUserId?: unknown;
  agreementType?: unknown;
  agreementValue?: unknown;
  discount?: unknown;
  discountAmount?: unknown;
};

async function resolveLeadId(context: RouteContext): Promise<string | null> {
  const resolvedParams = await context.params;
  const id = resolvedParams?.id;

  if (typeof id !== 'string') return null;

  const trimmed = id.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}


function isMissingOptionalRelationError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  const code = (error as { code?: unknown }).code;
  return code === 'P2021' || code === 'P2022';
}

function toLeadStage(value: unknown): LeadStage | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  if (
    normalized === LeadStage.VISIT_SCHEDULED ||
    normalized === LeadStage.VISIT_RESCHEDULED ||
    normalized === LeadStage.VISIT_COMPLETED ||
    normalized === LeadStage.VISIT_CANCELLED
  ) {
    return LeadStage.VISIT_PHASE;
  }
  return Object.values(LeadStage).includes(normalized as LeadStage)
    ? (normalized as LeadStage)
    : null;
}

function toLeadSubStatus(value: unknown): LeadSubStatus | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string') return null;

  const normalized = value.trim().toUpperCase();
  return Object.values(LeadSubStatus).includes(normalized as LeadSubStatus)
    ? (normalized as LeadSubStatus)
    : null;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    debugLog('🔵 [lead/:id/stage][PATCH] - Request received');
    
    // Get authenticated user ID from auth context
    const authResult = await requireDatabaseRoles([]);
    if (!authResult.ok) {
      return authResult.response;
    }
    const userId = authResult.actorUserId;
    const actorDepartments = authResult.actor.userDepartments ?? [];
    const isJrArchitectLeader =
      actorDepartments.includes('JR_ARCHITECT') &&
      hasJrArchitectureLeaderRole(authResult.actorRoles);
    const canDropVisitQueueLead =
      actorDepartments.includes('ADMIN') ||
      actorDepartments.includes('SR_CRM') ||
      isJrArchitectLeader;
    debugLog('🔐 [lead/:id/stage][PATCH] - Auth verified for user:', userId);
    
    const leadId = await resolveLeadId(context);
    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Invalid lead id' }, { status: 400 });
    }
    debugLog('📝 [lead/:id/stage][PATCH] - Lead ID:', leadId);

    const body = (await request.json()) as UpdateLeadStageBody;
    const nextStage = toLeadStage(body.stage);
    const requestedSubStatus = toLeadSubStatus(body.subStatus);
    const reason = toOptionalString(body.reason);
    const requestedJrArchitectUserId = toOptionalString(body.jrArchitectUserId);
    const requestedQuotationUserId = toOptionalString(body.quotationUserId);
    const agreementType = toOptionalString(body.agreementType);
    const agreementValueRaw = body.agreementValue;
    const agreementValue = typeof agreementValueRaw === 'number' ? agreementValueRaw : typeof agreementValueRaw === 'string' ? parseFloat(agreementValueRaw) : null;
    const discountRaw = body.discountAmount ?? body.discount;
    const discountInput = typeof discountRaw === 'number' ? discountRaw : typeof discountRaw === 'string' ? parseFloat(discountRaw) : null;
    debugLog('📋 [lead/:id/stage][PATCH] - Extracted fields. Stage:', nextStage, 'SubStatus:', requestedSubStatus);

    if (!nextStage) {
      return NextResponse.json({ success: false, error: 'Valid stage is required' }, { status: 400 });
    }

    const closedDropSubStatuses = new Set<LeadSubStatus>([
      LeadSubStatus.PROJECT_DROPPED,
      LeadSubStatus.REJECTED_OFFER,
      LeadSubStatus.SMALL_BUDGET,
      LeadSubStatus.INVALID,
      LeadSubStatus.NOT_INTERESTED,
      LeadSubStatus.LOST,
      LeadSubStatus.DEAD_LEAD,
    ]);
    const isVisitQueueDropRequest =
      canDropVisitQueueLead &&
      nextStage === LeadStage.CLOSED &&
      requestedSubStatus !== undefined &&
      requestedSubStatus !== null &&
      closedDropSubStatuses.has(requestedSubStatus);
    const isBudgetMeetingCompletionRequest =
      actorDepartments.some((department) =>
        ['ADMIN', 'SR_CRM', 'JR_ARCHITECT'].includes(department),
      ) &&
      ((nextStage === LeadStage.CONVERSION &&
        requestedSubStatus === LeadSubStatus.CLIENT_CONFIRMED) ||
        (nextStage === LeadStage.BUDGET_PHASE &&
          requestedSubStatus === LeadSubStatus.REJECTED_OFFER));
    const leadWhere = isBudgetMeetingCompletionRequest || isVisitQueueDropRequest
      ? { id: leadId }
      : buildScopedLeadWhere({
          leadId,
          actorUserId: userId,
          actorDepartments,
          actorRoles: authResult.actorRoles,
        });

    const existingLead = await prisma.lead.findFirst({
      where: leadWhere,
      select: { id: true, stage: true, subStatus: true, primaryOwnerUserId: true },
    });

    if (!existingLead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    const nextSubStatus =
      requestedSubStatus !== undefined
        ? requestedSubStatus
        : isSubStatusAllowedForStage(nextStage, existingLead.subStatus)
          ? existingLead.subStatus
          : null;

    if (!isSubStatusAllowedForStage(nextStage, nextSubStatus)) {
      return NextResponse.json(
        { success: false, error: 'Invalid subStatus for selected stage' },
        { status: 400 }
      );
    }
    const cadSubStatuses = new Set<LeadSubStatus>([
      LeadSubStatus.CAD_ASSIGNED,
      LeadSubStatus.CAD_WORKING,
      LeadSubStatus.CAD_COMPLETED,
      LeadSubStatus.CAD_APPROVED,
    ]);
    const hadCadProgressBefore =
      existingLead.stage === LeadStage.CAD_PHASE &&
      existingLead.subStatus !== null &&
      cadSubStatuses.has(existingLead.subStatus);
    if (
      nextStage === LeadStage.CAD_PHASE &&
      nextSubStatus &&
      nextSubStatus !== LeadSubStatus.CAD_ASSIGNED &&
      !hadCadProgressBefore
    ) {
      return NextResponse.json(
        { success: false, error: 'Please set CAD Assigned first before other CAD substatuses.' },
        { status: 409 },
      );
    }
    if (nextStage === LeadStage.CAD_PHASE && nextSubStatus === LeadSubStatus.CAD_ASSIGNED && !requestedJrArchitectUserId) {
      return NextResponse.json(
        { success: false, error: 'JR Architect assignment is required for CAD Assigned.' },
        { status: 400 },
      );
    }
    if (
      nextStage === LeadStage.CAD_PHASE &&
      nextSubStatus === LeadSubStatus.CAD_ASSIGNED &&
      requestedJrArchitectUserId
    ) {
      const jrArchitect = await prisma.user.findFirst({
        where: {
          id: requestedJrArchitectUserId,
          isActive: true,
          userDepartments: { some: { department: { name: 'JR_ARCHITECT' } } },
        },
        select: { id: true },
      });
      if (!jrArchitect) {
        return NextResponse.json(
          { success: false, error: 'Selected JR Architect is invalid or inactive.' },
          { status: 400 },
        );
      }
    }

    const quotationSubStatuses = new Set<LeadSubStatus>([
      LeadSubStatus.QUOTATION_ASSIGNED,
      LeadSubStatus.QUOTATION_WORKING,
      LeadSubStatus.QUOTATION_COMPLETED,
      LeadSubStatus.QUOTATION_APPROVED,
      LeadSubStatus.QUOTATION_CORRECTION,
    ]);
    const hadQuotationProgressBefore =
      existingLead.stage === LeadStage.QUOTATION_PHASE &&
      existingLead.subStatus !== null &&
      quotationSubStatuses.has(existingLead.subStatus);
    if (
      nextStage === LeadStage.QUOTATION_PHASE &&
      nextSubStatus &&
      nextSubStatus !== LeadSubStatus.QUOTATION_ASSIGNED &&
      !hadQuotationProgressBefore
    ) {
      return NextResponse.json(
        { success: false, error: 'Please set Quotation Assigned first before other quotation substatuses.' },
        { status: 409 },
      );
    }
    if (
      nextStage === LeadStage.QUOTATION_PHASE &&
      nextSubStatus === LeadSubStatus.QUOTATION_ASSIGNED &&
      !requestedQuotationUserId
    ) {
      return NextResponse.json(
        { success: false, error: 'Quotation assignment is required for Quotation Assigned.' },
        { status: 400 },
      );
    }
    if (
      nextStage === LeadStage.QUOTATION_PHASE &&
      nextSubStatus === LeadSubStatus.QUOTATION_ASSIGNED &&
      requestedQuotationUserId
    ) {
      const quotationMember = await prisma.user.findFirst({
        where: {
          id: requestedQuotationUserId,
          isActive: true,
          userDepartments: { some: { department: { name: { in: ['QUOTATION', 'QUOTATION_TEAM'] } } } },
        },
        select: { id: true },
      });
      if (!quotationMember) {
        return NextResponse.json(
          { success: false, error: 'Selected quotation member is invalid or inactive.' },
          { status: 400 },
        );
      }
    }
    if (nextStage === LeadStage.VISIT_PHASE && nextSubStatus === LeadSubStatus.VISIT_COMPLETED) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Visit Completed must be submitted from the visit result flow.',
        },
        { status: 409 },
      );
    }
    if (!canManagePaymentStatus({ actorDepartments, nextSubStatus })) {
      return NextResponse.json(
        { success: false, error: 'Only Senior CRM, Accounts, or Admin can update payment statuses' },
        { status: 403 },
      );
    }
    const isBudgetMeetingCompletion =
      existingLead.stage === LeadStage.BUDGET_PHASE &&
      existingLead.subStatus === LeadSubStatus.BUDGET_MEETING_SET &&
      isBudgetMeetingCompletionRequest;
    const isAuthorizedVisitQueueDrop = isVisitQueueDropRequest;

    if (
      !isBudgetMeetingCompletion &&
      !isAuthorizedVisitQueueDrop &&
      !canManagePrimaryLeadFlow({
        actorUserId: userId,
        actorDepartments,
        actorRoles: authResult.actorRoles,
        lead: { primaryOwnerUserId: existingLead.primaryOwnerUserId },
      })
    ) {
      return NextResponse.json(
        { success: false, error: 'Only primary owner, Senior CRM, Admin, JR Architect leader drop, or JR Architect budget meeting completion can change lead flow' },
        { status: 403 },
      );
    }

    let notifyVisitMemberOfCadId: string | null = null;

    const updatedLead = await prisma.$transaction(async (tx) => {
      let finalAgreementValue = agreementValue;
      if (agreementType !== null || agreementValue !== null || (discountInput !== null && discountInput > 0)) {
        const syncResult = await processAgreementAndDiscountSync({
          tx,
          leadId,
          actorUserId: userId,
          agreementValueInput: agreementValue,
          discountAmountInput: discountInput,
        });
        if (syncResult.settledAgreementValue !== null) {
          finalAgreementValue = syncResult.settledAgreementValue;
        }
      }

      const updated = await tx.lead.update({
        where: { id: leadId },
        data: {
          stage: nextStage,
          subStatus: nextSubStatus,
          ...(agreementType !== null ? { agreementType } : {}),
          ...(finalAgreementValue !== null && !isNaN(finalAgreementValue) ? { agreementValue: finalAgreementValue } : {}),
          ...(agreementType !== null ? { accountStatus: 'PENDING' } : {}),
        },
      });

      if (existingLead.stage !== nextStage) {
        await logLeadStageChanged(tx, {
          leadId,
          userId,
          from: existingLead.stage,
          to: nextStage,
          reason,
        });
      }

      if (existingLead.subStatus !== nextSubStatus) {
        await logLeadSubStatusChanged(tx, {
          leadId,
          userId,
          from: existingLead.subStatus,
          to: nextSubStatus,
          reason,
        });
      }

      if (requiresSrCrmAssignment(nextStage)) {
        await ensureSeniorCrmAssignment({
          tx,
          leadId,
          actorUserId: userId,
        });
      }

      const autoHandoffDepartment = handoffDepartmentForSubStatus(nextSubStatus);
      if (autoHandoffDepartment) {
        await ensureDepartmentAssignment({
          tx,
          leadId,
          department: autoHandoffDepartment,
          preferredUserId:
            autoHandoffDepartment === 'JR_ARCHITECT'
              ? requestedJrArchitectUserId
              : autoHandoffDepartment === 'QUOTATION'
                ? requestedQuotationUserId
                : undefined,
          actorUserId: userId,
        });
      }

      if (
        nextStage === LeadStage.CAD_PHASE &&
        nextSubStatus === LeadSubStatus.CAD_ASSIGNED &&
        requestedJrArchitectUserId
      ) {
        const existingJrAssignment = await tx.leadAssignment.findFirst({
          where: { leadId, department: 'JR_ARCHITECT' },
          select: { id: true },
        })
        if (existingJrAssignment) {
          await tx.leadAssignment.update({
            where: { id: existingJrAssignment.id },
            data: { userId: requestedJrArchitectUserId },
          })
        } else {
          await tx.leadAssignment.create({
            data: { leadId, department: 'JR_ARCHITECT', userId: requestedJrArchitectUserId },
          })
        }
      }
      try {
        await ensurePhaseTaskForSubStatus({
          tx,
          leadId,
          subStatus: nextSubStatus,
          actorUserId: userId,
        });
        await createSrCadReviewTodosForCadStart({
          tx,
          leadId,
          fromStage: existingLead.stage,
          fromSubStatus: existingLead.subStatus,
          toStage: nextStage,
          toSubStatus: nextSubStatus,
          triggeredByUserId: userId,
        });
      } catch (error) {
        if (!isMissingOptionalRelationError(error)) throw error;
        console.warn('[lead/:id/stage][PATCH] Optional workflow relation unavailable, continuing stage update');
      }

      await autoCompletePendingFollowups(tx, {
        leadId,
        userId,
        action: 'stage update',
      });

      if (nextStage === LeadStage.CAD_PHASE && nextSubStatus === LeadSubStatus.CAD_ASSIGNED) {
        const visitAssignment = await tx.leadAssignment.findFirst({
          where: {
            leadId,
            department: LeadAssignmentDepartment.VISIT_TEAM,
          },
          select: { userId: true },
        });
        if (visitAssignment) {
          notifyVisitMemberOfCadId = visitAssignment.userId;
        }
      }

      return updated;
    });

    if (notifyVisitMemberOfCadId) {
      try {
        await sendPushToUser(
          notifyVisitMemberOfCadId,
          'CAD Assigned',
          `CAD stage has been assigned for lead "${updatedLead.name}".`,
          { type: 'CAD_ASSIGNED', leadId: updatedLead.id }
        );
      } catch (pushErr) {
        console.error('[lead/:id/stage] Failed to send CAD assignment push to visit member:', pushErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedLead,
      message: 'Lead stage updated successfully',
    });
  } catch (error) {
    console.error('[lead/:id/stage][PATCH] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update lead stage' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: 'PATCH, OPTIONS',
    },
  });
}
