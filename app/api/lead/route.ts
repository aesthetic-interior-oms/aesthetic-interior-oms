import prisma from '@/lib/prisma';
import {
  LeadAssignmentDepartment,
  LeadPhaseType,
  LeadPrimaryOwnerDepartment,
  LeadSubStatus,
  LeadStage,
  ActivityType,
  NotificationType,
  ProjectStatus,
  Prisma,
} from '@/generated/prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { logLeadCreated } from '@/lib/activity-log-service';
import { logActivity, logLeadStageChanged, logUserAssigned } from '@/lib/activity-log-service';
import { requireDatabaseRoles } from '@/lib/authz';
import { formatServerTiming, timeAsync } from '@/lib/server-timing';
import { findVisitConflict } from '@/lib/visit-guards';
import { autoCompletePendingFollowups } from '@/lib/followup-auto-complete';
import { getWeeklySeniorCrmAssignment } from '@/lib/sr-crm-rotation';
import { isFacebookConfigured } from '@/lib/facebook';
import { maybeRunFacebookFallbackSync, runFacebookSyncWithControl } from '@/lib/facebook-sync-control';
import { maybeRunInstagramFallbackSync } from '@/lib/instagram-sync-control';
import { formatPhoneForStorage } from '@/lib/phone-normalize';
import { sendPushToUser } from '@/lib/fcm-service';

export const runtime = 'nodejs';
export const preferredRegion = 'sin1';

/*
  POSTMAN TESTING DATA
  =====================
  
  GET - Fetch all leads
  =====================
  URL: http://localhost:3000/api/lead
  Method: GET
  Headers: 
    - Authorization: Bearer {token}
  
  Expected Success Response (200):
  {
    "success": true,
    "data": [
      {
        "id": "cmmhfdt160000vzwb5ai4ej2g",
        "name": "Moinul Islam",
        "phone": "+8801234567890",
        "email": "moinul@example.com",
        "source": "Website",
        "location": "Dhaka",
        
        "stage": "NEW",
        "budget": 500000,
        "created_at": "2026-03-09T08:03:54.636Z",
        "updated_at": "2026-03-09T08:03:54.636Z",
        "assignedTo": null,
        "assignee": null
      }
    ]
  }
  
  =====================
  POST - Create a new lead
  =====================
  URL: http://localhost:3000/api/lead
  Method: POST
  Headers: 
    - Content-Type: application/json
    - Authorization: Bearer {token}
  
  REQUIRED FIELDS: name, phone
  OPTIONAL FIELDS: email, source, location, budget
  
  Request Body (with email):
  {
    "name": "John Doe",
    "phone": "+1234567890",
    "email": "john@example.com",
    "source": "Website",
    "location": "New York",
    "budget": 500000
  }
  
  Request Body (without email - email is OPTIONAL):
  {
    "name": "Jane Smith",
    "phone": "+0987654321",
    "source": "Referral",
    "location": "Los Angeles"
  }
  
  Minimal Request Body (only required fields):
  {
    "name": "Bob Wilson",
    "phone": "+9876543210"
  }
  
  Example curl (with email):
  curl -X POST http://localhost:3000/api/lead \
    -H "Content-Type: application/json" \
    -d '{"name": "John Doe", "phone": "+1234567890", "email": "john@example.com"}'
  
  Example curl (without email - email is optional):
  curl -X POST http://localhost:3000/api/lead \
    -H "Content-Type: application/json" \
    -d '{"name": "Jane Smith", "phone": "+0987654321"}'
  
  Expected Success Response (201):
  {
    "success": true,
    "data": {
      "id": "cmmhfdt160000vzwb5ai4ej2g",
      "name": "John Doe",
      "phone": "+1234567890",
      "email": "john@example.com",
      "source": "Website",
      "location": "New York",
      "budget": 500000,
      "status": "NEW",
      "stage": "NEW",
      "created_at": "2026-03-09T10:00:00.000Z",
      "updated_at": "2026-03-09T10:00:00.000Z",
      "assignedTo": null,
      "assignee": null
    },
    "message": "Lead created successfully"
  }
  
  Expected Error Responses:
  - Missing required fields (400):
    {"success": false, "error": "Name and phone are required"}
  
  - Phone already exists (409):
    {"success": false, "error": "A lead with this phone number already exists"}
  
  - Server error (500):
    {"success": false, "error": "Failed to create lead"}
*/

// Type definition for the request body when creating a lead
type CreateLeadBody = {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  source?: unknown;
  location?: unknown;
  budget?: unknown;
  assignedToId?: unknown;
  scheduleVisit?: unknown;
  visit?: unknown;
};

type CreateLeadVisitBody = {
  visitTeamUserId?: unknown;
  seniorCrmUserId?: unknown;
  notes?: unknown;
  reason?: unknown;
  projectSqft?: unknown;
  visitFee?: unknown;
  projectStatus?: unknown;
  scheduledAt?: unknown;
  location?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// Utility function to safely convert unknown values to optional strings
// Returns null if value is not a string or is empty after trimming
function toOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// Utility function to safely convert unknown values to optional numbers (for budget)
// Returns null if value is not a valid finite number
function toBudget(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toPhoneForStorage(value: unknown): string | null {
  const raw = toOptionalString(value);
  if (!raw) return null;

  const normalized = formatPhoneForStorage(raw);
  if (!normalized) return raw.replace(/\D/g, '') || raw;

  // Store Bangladesh numbers as local format (01XXXXXXXXX) for easier direct dialing.
  if (/^8801[3-9]\d{8}$/.test(normalized)) {
    return `0${normalized.slice(3)}`;
  }

  return normalized;
}

function toLeadStageParam(value: string | null): LeadStage | null {
  const normalized = toOptionalString(value);
  if (!normalized || normalized === 'ALL') return null;
  const upper = normalized.toUpperCase();
  if (
    upper === LeadStage.VISIT_SCHEDULED ||
    upper === LeadStage.VISIT_RESCHEDULED ||
    upper === LeadStage.VISIT_COMPLETED ||
    upper === LeadStage.VISIT_CANCELLED
  ) {
    return LeadStage.VISIT_PHASE;
  }
  return Object.values(LeadStage).includes(upper as LeadStage) ? (upper as LeadStage) : null;
}

function toOptionalNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toProjectStatus(value: unknown): ProjectStatus | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  return Object.values(ProjectStatus).includes(normalized as ProjectStatus) ? (normalized as ProjectStatus) : null;
}

function toPositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function toBooleanParam(value: string | null): boolean {
  const normalized = toOptionalString(value)?.toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function parseDateAtStartOfDayUtc(value: string | null): Date | null {
  const normalized = toOptionalString(value);
  if (!normalized) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const date = new Date(`${normalized}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateAtEndOfDayUtc(value: string | null): Date | null {
  const normalized = toOptionalString(value);
  if (!normalized) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const date = new Date(`${normalized}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getCreateLeadErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : null;
  switch (message) {
    case 'INVALID_VISIT_PARAMS':
      return NextResponse.json(
        { success: false, error: 'Visit team member and a valid visit date/time are required to schedule a visit.' },
        { status: 400 },
      );
    case 'LOCATION_REQUIRED':
      return NextResponse.json(
        { success: false, error: 'Lead location is required when scheduling a visit.' },
        { status: 400 },
      );
    case 'INVALID_PROJECT_SQFT':
      return NextResponse.json(
        { success: false, error: 'Project square feet must be greater than 0.' },
        { status: 400 },
      );
    case 'INVALID_VISIT_FEE':
      return NextResponse.json(
        { success: false, error: 'Visit fee cannot be negative.' },
        { status: 400 },
      );
    case 'INVALID_PROJECT_STATUS':
      return NextResponse.json(
        { success: false, error: 'Selected project status is not valid.' },
        { status: 400 },
      );
    case 'VISIT_ASSIGNEE_NOT_FOUND':
      return NextResponse.json(
        { success: false, error: 'Selected visit team member was not found.' },
        { status: 400 },
      );
    case 'VISIT_ASSIGNEE_INVALID_DEPT':
      return NextResponse.json(
        { success: false, error: 'Selected user is not mapped to the visit team.' },
        { status: 400 },
      );
    case 'LATEST_VISIT_BLOCKS_SCHEDULING':
      return NextResponse.json(
        { success: false, error: 'This lead already has an active visit. Complete or cancel it before scheduling another visit.' },
        { status: 409 },
      );
    case 'VISIT_CONFLICT':
      return NextResponse.json(
        { success: false, error: 'Selected visit team member already has a nearby scheduled visit.' },
        { status: 409 },
      );
    default:
      return null;
  }
}

// GET endpoint - Retrieve leads from the database (paginated)
export async function GET(request: NextRequest) {
  const requestStart = performance.now();
  try {
    // console.log('🔵 [GET /api/lead] - Request received');

    const timedAuth = await timeAsync(async () => requireDatabaseRoles([]));
    const authResult = timedAuth.value;
    if (!authResult.ok) {
      return authResult.response;
    }

    const departmentNames = new Set(authResult.actor.userDepartments ?? []);
    const isJuniorCrm = departmentNames.has('JR_CRM');
    const isAdmin = departmentNames.has('ADMIN');
    const isSeniorCrm = departmentNames.has('SR_CRM');
    const isJrArchitect = departmentNames.has('JR_ARCHITECT');
    const isVisualizer = departmentNames.has('VISUALIZER_3D');

    const baseWhere: Prisma.LeadWhereInput = isAdmin
      ? {}
      : isJuniorCrm
        ? {
            assignments: {
              some: {
                userId: authResult.actorUserId,
                department: LeadAssignmentDepartment.JR_CRM,
              },
            },
          }
        : isSeniorCrm
          ? {
              assignments: {
                some: {
                  userId: authResult.actorUserId,
                  department: LeadAssignmentDepartment.SR_CRM,
                },
              },
            }
          : isJrArchitect
            ? {
                assignments: {
                  some: {
                    userId: authResult.actorUserId,
                    department: LeadAssignmentDepartment.JR_ARCHITECT,
                  },
                },
              }
        : isVisualizer
            ? {
                assignments: {
                  some: {
                    userId: authResult.actorUserId,
                    department: LeadAssignmentDepartment.VISUALIZER_3D,
                  },
                },
              }
        : {};

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(toPositiveInt(searchParams.get('limit'), 20), 100);
    const offset = toPositiveInt(searchParams.get('offset'), 0);
    const stageParam = toLeadStageParam(searchParams.get('stage'));
    const searchParam = toOptionalString(searchParams.get('search'));
    const sourceParam = toOptionalString(searchParams.get('source'));
    const includeAttachmentPreview = toBooleanParam(searchParams.get('includeAttachmentPreview'));
    const includeCadCorrectionFlag = toBooleanParam(searchParams.get('includeCadCorrectionFlag'));
    const unassignedOnly = toBooleanParam(searchParams.get('unassigned'));
    const createdFrom = parseDateAtStartOfDayUtc(searchParams.get('createdFrom'));
    const createdTo = parseDateAtEndOfDayUtc(searchParams.get('createdTo'));
    const hasCreatedFromParam = Boolean(toOptionalString(searchParams.get('createdFrom')));
    const hasCreatedToParam = Boolean(toOptionalString(searchParams.get('createdTo')));

    if ((hasCreatedFromParam && !createdFrom) || (hasCreatedToParam && !createdTo)) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format. Use YYYY-MM-DD for createdFrom/createdTo.' },
        { status: 400 },
      );
    }

    if (createdFrom && createdTo && createdFrom.getTime() > createdTo.getTime()) {
      return NextResponse.json(
        { success: false, error: 'createdFrom must be before or equal to createdTo.' },
        { status: 400 },
      );
    }

    const createdAtWhere: Prisma.DateTimeFilter | undefined =
      createdFrom || createdTo
        ? {
            ...(createdFrom ? { gte: createdFrom } : {}),
            ...(createdTo ? { lte: createdTo } : {}),
          }
        : undefined;

    const where: Prisma.LeadWhereInput = {
      ...baseWhere,
      ...(stageParam ? { stage: stageParam } : {}),
      ...(sourceParam ? { source: { equals: sourceParam, mode: 'insensitive' } } : {}),
      ...(unassignedOnly
        ? {
            assignments: {
              none: {
                department: LeadAssignmentDepartment.JR_CRM,
              },
            },
          }
        : {}),
      ...(createdAtWhere ? { created_at: createdAtWhere } : {}),
      ...(searchParam
        ? {
            OR: [
              { name: { contains: searchParam, mode: 'insensitive' } },
              { email: { contains: searchParam, mode: 'insensitive' } },
              { phone: { contains: searchParam, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    let facebookTimingMetric = '';
    const syncFacebookFlag = request.nextUrl.searchParams.get('syncFacebook') === '1';
    const hasCreatedDateFilter = Boolean(createdAtWhere);
    const shouldSyncFacebook =
      syncFacebookFlag &&
      offset === 0 &&
      !searchParam &&
      !stageParam &&
      !sourceParam &&
      !unassignedOnly &&
      !hasCreatedDateFilter &&
      isFacebookConfigured();

    const shouldRunFallbackFacebookSync =
      offset === 0 &&
      !searchParam &&
      !stageParam &&
      !sourceParam &&
      !unassignedOnly &&
      !hasCreatedDateFilter;

    if (shouldRunFallbackFacebookSync) {
      try {
        await maybeRunFacebookFallbackSync();
      } catch (syncError) {
        console.error('[GET /api/lead] Facebook fallback sync failed:', syncError);
      }
      try {
        await maybeRunInstagramFallbackSync();
      } catch (syncError) {
        console.error('[GET /api/lead] Instagram fallback sync failed:', syncError);
      }
    }

    if (shouldSyncFacebook) {
      try {
        const timedFacebookSync = await timeAsync(async () =>
          runFacebookSyncWithControl('MANUAL'),
        );
        const syncResult = timedFacebookSync.value;
        facebookTimingMetric = formatServerTiming(
          'fb_sync',
          timedFacebookSync.durationMs,
          `created=${syncResult.createdLeads},fetched=${syncResult.fetchedConversations}`,
        );
      } catch (syncError) {
        console.error('[GET /api/lead] Facebook sync failed:', syncError);
      }
    }

    const timedDb = await timeAsync(async () => {
      const leadSelect: Prisma.LeadSelect = {
        id: true,
        name: true,
        phone: true,
        email: true,
        source: true,
        stage: true,
        subStatus: true,
        budget: true,
        location: true,
        assignedTo: true,
        created_at: true,
        updated_at: true,
        assignments: {
          where: { department: LeadAssignmentDepartment.JR_CRM },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
      };
      const stageCountWhere: Prisma.LeadWhereInput = {
        ...baseWhere,
        ...(sourceParam ? { source: { equals: sourceParam, mode: 'insensitive' } } : {}),
        ...(unassignedOnly
          ? {
              assignments: {
                none: {
                  department: LeadAssignmentDepartment.JR_CRM,
                },
              },
            }
          : {}),
        ...(createdAtWhere ? { created_at: createdAtWhere } : {}),
      };
      const [total, leads] = await Promise.all([
        prisma.lead.count({ where }),
        prisma.lead.findMany({
          where,
          orderBy: { created_at: 'desc' },
          select: leadSelect,
          skip: offset,
          take: limit,
        }),
      ]);
      const leadIds = leads.map((lead) => lead.id);
      const [attachmentResult, phaseTaskResult, groupedStageCountsResult] = await Promise.allSettled([
        includeAttachmentPreview && leadIds.length > 0
          ? prisma.leadAttachment.findMany({
              where: { leadId: { in: leadIds } },
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                leadId: true,
                url: true,
                fileName: true,
                fileType: true,
                category: true,
                sizeBytes: true,
                createdAt: true,
              },
            })
          : Promise.resolve([]),
        includeCadCorrectionFlag && leadIds.length > 0
          ? prisma.leadPhaseTask.findMany({
              where: { leadId: { in: leadIds }, phaseType: LeadPhaseType.CAD },
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                leadId: true,
                status: true,
                currentReviewRound: true,
              },
            })
          : Promise.resolve([]),
        prisma.lead.groupBy({
          by: ['stage'],
          where: stageCountWhere,
          _count: { stage: true },
        }),
      ]);

      if (attachmentResult.status === 'rejected') {
        console.error('[GET /api/lead] Attachment preview enrichment failed:', attachmentResult.reason);
      }
      if (phaseTaskResult.status === 'rejected') {
        console.error('[GET /api/lead] CAD correction enrichment failed:', phaseTaskResult.reason);
      }
      if (groupedStageCountsResult.status === 'rejected') {
        console.error('[GET /api/lead] Stage count enrichment failed:', groupedStageCountsResult.reason);
      }

      type AttachmentPreviewRow = {
        id: string;
        leadId: string;
        url: string;
        fileName: string;
        fileType: string;
        category: string;
        sizeBytes: number | null;
        createdAt: Date;
      };
      type PhaseTaskPreviewRow = {
        id: string;
        leadId: string;
        status: string;
        currentReviewRound: number;
      };

      const attachmentsByLeadId = new Map<string, Array<Omit<AttachmentPreviewRow, 'leadId'>>>();
      if (attachmentResult.status === 'fulfilled') {
        for (const attachment of attachmentResult.value as AttachmentPreviewRow[]) {
          const { leadId, ...preview } = attachment;
          const attachments = attachmentsByLeadId.get(leadId) ?? [];
          if (attachments.length < 6) attachments.push(preview);
          attachmentsByLeadId.set(leadId, attachments);
        }
      }

      const phaseTasksByLeadId = new Map<string, Array<Omit<PhaseTaskPreviewRow, 'leadId'>>>();
      if (phaseTaskResult.status === 'fulfilled') {
        for (const phaseTask of phaseTaskResult.value as PhaseTaskPreviewRow[]) {
          const { leadId, ...task } = phaseTask;
          if (!phaseTasksByLeadId.has(leadId)) phaseTasksByLeadId.set(leadId, [task]);
        }
      }

      const enrichedLeads = leads.map((lead) => ({
        ...lead,
        ...(includeAttachmentPreview ? { attachments: attachmentsByLeadId.get(lead.id) ?? [] } : {}),
        ...(includeCadCorrectionFlag ? { phaseTasks: phaseTasksByLeadId.get(lead.id) ?? [] } : {}),
      }));
      const groupedStageCounts = groupedStageCountsResult.status === 'fulfilled' ? groupedStageCountsResult.value : [];
      return { total, leads: enrichedLeads, groupedStageCounts };
    });

    const { total, leads, groupedStageCounts } = timedDb.value;

    const stageCounts = Object.values(LeadStage).reduce<Record<string, number>>((acc, stage) => {
      const grouped = groupedStageCounts.find((entry) => entry.stage === stage);
      acc[stage] = grouped?._count.stage ?? 0;
      return acc;
    }, {});

    const nextOffset = offset + leads.length;
    const hasMore = nextOffset < total;

    // console.log('📊 [GET /api/lead] - Found', leads.length, 'leads in page');

    const response = NextResponse.json({
      success: true,
      data: leads,
      meta: {
        total,
        limit,
        offset,
        nextOffset: hasMore ? nextOffset : null,
        hasMore,
        stageCounts,
      },
    });
    const totalDurationMs = performance.now() - requestStart;
    response.headers.set(
      'Server-Timing',
      [
        formatServerTiming('auth', timedAuth.durationMs, 'requireDatabaseRoles'),
        formatServerTiming('db', timedDb.durationMs, 'lead queries'),
        ...(facebookTimingMetric ? [facebookTimingMetric] : []),
        formatServerTiming('total', totalDurationMs, 'request total'),
      ].join(', '),
    );
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (error) {
    console.error('❌ [GET /api/lead] - Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}

// POST endpoint - Create a new lead
// Validates required fields (name, phone) - EMAIL IS OPTIONAL
// Checks for duplicate phone numbers
// Automatically gets the current user from authentication
// Uses database transaction to ensure atomicity when creating lead and activity log
export async function POST(request: NextRequest) {
  try {
    // console.log('🔵 [POST /api/lead] - Request received');
    
    // Verify user authentication and get user ID
    const authResult = await requireDatabaseRoles([]);
    // console.log('✅ [POST /api/lead] - Auth passed');
    if (!authResult.ok) {
      return authResult.response;
    }
    // console.log('🔐 [POST /api/lead] - Auth verified for user:', authResult.actorUserId);

    // Parse incoming JSON request body
    // console.log('📝 [POST /api/lead] - Parsing request body');
    const body = (await request.json()) as CreateLeadBody;

    // Extract and validate required fields
    const name = toOptionalString(body.name);
    const phone = toPhoneForStorage(body.phone);
    const email = toOptionalString(body.email)?.toLowerCase();
    const source = toOptionalString(body.source);
    const requestedAssigneeId = toOptionalString(body.assignedToId);
    // console.log('📋 [POST /api/lead] - Extracted fields. Name:', name, 'Phone:', phone, 'Email:', email);

    // Return 400 error if required fields are missing or invalid
    if (!name || !source) {
      return NextResponse.json(
        { success: false, error: 'Name and source are required' },
        { status: 400 }
      );
    }

    const actor = await prisma.user.findUnique({
      where: { id: authResult.actorUserId },
      select: {
        id: true,
        userDepartments: { select: { department: { select: { name: true } } } },
      },
    });

    const departmentNames = new Set(
      (actor?.userDepartments ?? []).map((row) => row.department.name),
    );
    const isJuniorCrm = departmentNames.has('JR_CRM');
    const isAdmin = departmentNames.has('ADMIN');

    let jrCrmAssigneeId = requestedAssigneeId;
    if (!jrCrmAssigneeId && isJuniorCrm && !isAdmin) {
      jrCrmAssigneeId = authResult.actorUserId;
    }

    if (phone) {
      // Check if a lead with the same phone already exists to prevent duplicates
      // console.log('🔄 [POST /api/lead] - Checking for duplicate phone');
      const existingLead = await prisma.lead.findFirst({
        where: { phone },
        select: { id: true },
      });
      // console.log('📊 [POST /api/lead] - Duplicate check result:', existingLead);

      // Return 409 Conflict if phone already exists
      if (existingLead) {
        return NextResponse.json(
          { success: false, error: 'A lead with this phone number already exists' },
          { status: 409 }
        );
      }
    }

    if (jrCrmAssigneeId) {
      const jrCrmUser = await prisma.user.findUnique({
        where: { id: jrCrmAssigneeId },
        select: {
          id: true,
          userDepartments: { select: { department: { select: { name: true } } } },
        },
      });

      const jrDepartments = new Set(
        (jrCrmUser?.userDepartments ?? []).map((row) => row.department.name),
      );

      if (!jrCrmUser || !jrDepartments.has('JR_CRM')) {
        return NextResponse.json(
          { success: false, error: 'Selected user is not mapped to JR_CRM department' },
          { status: 400 }
        );
      }
    }

    // Create lead and activity log in a transaction
    // Transaction ensures both operations succeed or both fail
    // console.log('💾 [POST /api/lead] - Creating lead and activity log in transaction');
    const lead = await prisma.$transaction(async (tx) => {
      const stage = phone ? LeadStage.NUMBER_COLLECTED : LeadStage.NEW
      const primaryOwnerDepartment = jrCrmAssigneeId
        ? LeadPrimaryOwnerDepartment.JR_CRM
        : null
      const primaryOwnerUserId = jrCrmAssigneeId ?? null

      // Create the new lead with validated data
      const newLead = await tx.lead.create({
        data: {
          name,
          phone: phone ?? null,
          email,
          source,
          location: toOptionalString(body.location),
          budget: toBudget(body.budget),
          stage,
          ...(jrCrmAssigneeId ? { assignedTo: jrCrmAssigneeId } : {}),
          ...(primaryOwnerDepartment ? { primaryOwnerDepartment } : {}),
          ...(primaryOwnerUserId ? { primaryOwnerUserId } : {}),
        },
        // Include assignee details in the response
        include: {
          assignee: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });
      // console.log('✨ [POST /api/lead] - Lead created:', newLead.id);

      if (jrCrmAssigneeId) {
        await tx.leadAssignment.create({
          data: {
            leadId: newLead.id,
            userId: jrCrmAssigneeId,
            department: LeadAssignmentDepartment.JR_CRM,
          },
        });
      }

      // Log the lead creation activity with the authenticated user
      await logLeadCreated(tx, {
        leadId: newLead.id,
        userId: authResult.actorUserId,
        leadName: name,
      });

      // Optionally schedule a visit as part of lead creation
      const shouldSchedule = Boolean(body.scheduleVisit);
      if (shouldSchedule) {
        try {
          const visitBody: CreateLeadVisitBody = isRecord(body.visit) ? body.visit : {};
          const visitTeamUserId = toOptionalString(visitBody.visitTeamUserId);
          const seniorCrmUserId = toOptionalString(visitBody.seniorCrmUserId);
          const notes = toOptionalString(visitBody.notes);
          const reason = toOptionalString(visitBody.reason) ?? 'Visit has been scheduled.';
          const projectSqft = toOptionalNumber(visitBody.projectSqft);
          const visitFee = toOptionalNumber(visitBody.visitFee);
          const projectStatus = toProjectStatus(visitBody.projectStatus);
          const scheduledAtRaw = toOptionalString(visitBody.scheduledAt);
          const parsedScheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : null;
          const explicitLocation = toOptionalString(visitBody.location) ?? toOptionalString(body.location) ?? null;

          if (!visitTeamUserId || !scheduledAtRaw || !parsedScheduledAt || Number.isNaN(parsedScheduledAt.getTime())) {
            throw new Error('INVALID_VISIT_PARAMS');
          }

          if (projectSqft !== null && projectSqft <= 0) {
            throw new Error('INVALID_PROJECT_SQFT');
          }

          if (visitFee !== null && visitFee < 0) {
            throw new Error('INVALID_VISIT_FEE');
          }

          if (projectStatus === null && visitBody.projectStatus) {
            throw new Error('INVALID_PROJECT_STATUS');
          }

          const weekly = await getWeeklySeniorCrmAssignment();

          const [visitAssignee, latestVisit] = await Promise.all([
            tx.user.findUnique({
              where: { id: visitTeamUserId },
              select: {
                id: true,
                fullName: true,
                userDepartments: { select: { department: { select: { name: true } } } },
              },
            }),
            tx.visit.findFirst({
              where: { leadId: newLead.id },
              orderBy: { createdAt: 'desc' },
              select: { id: true, status: true, result: { select: { id: true } } },
            }),
          ]);

          if (!visitAssignee) throw new Error('VISIT_ASSIGNEE_NOT_FOUND');
          const isAllowed = (visitAssignee.userDepartments ?? []).some((d) => d.department.name === 'VISIT_TEAM' || d.department.name === 'SR_CRM');
          if (!isAllowed) throw new Error('VISIT_ASSIGNEE_INVALID_DEPT');

          const latestVisitHasResult = Boolean(latestVisit?.result?.id);
          const latestVisitBlocksScheduling = Boolean(
            latestVisit &&
              (latestVisit.status === 'SCHEDULED' ||
                latestVisit.status === 'RESCHEDULED' ||
                (latestVisit.status === 'COMPLETED' && !latestVisitHasResult)),
          );
          if (latestVisitBlocksScheduling) throw new Error('LATEST_VISIT_BLOCKS_SCHEDULING');

          const locationToUse = explicitLocation ?? newLead.location;
          if (!locationToUse) throw new Error('LOCATION_REQUIRED');

          const conflict = await findVisitConflict(tx, { assignedToId: visitTeamUserId, scheduledAt: parsedScheduledAt });
          if (conflict) throw new Error('VISIT_CONFLICT');

          // update lead stage
          await tx.lead.update({ where: { id: newLead.id }, data: { stage: LeadStage.VISIT_PHASE, subStatus: LeadSubStatus.VISIT_SCHEDULED, location: locationToUse } });

          const visit = await tx.visit.create({
            data: {
              leadId: newLead.id,
              assignedToId: visitTeamUserId,
              createdById: authResult.actorUserId,
              scheduledAt: parsedScheduledAt,
              visitFee: visitFee ?? 0,
              projectSqft,
              projectStatus,
              location: locationToUse,
              notes,
            },
          });

          await tx.notification.createMany({
            data: [
              {
                userId: visitTeamUserId,
                leadId: newLead.id,
                visitId: visit.id,
                type: NotificationType.VISIT_ASSIGNED,
                title: 'New visit assigned',
                message: `You have been assigned a new visit for ${newLead.name}.`,
                scheduledFor: parsedScheduledAt,
              },
            ],
            skipDuplicates: true,
          });

          const adminUsers = await tx.user.findMany({ where: { isActive: true, userDepartments: { some: { department: { name: 'ADMIN' } } } }, select: { id: true } });
          if (adminUsers.length > 0) {
            await tx.notification.createMany({
              data: adminUsers.map((admin) => ({
                userId: admin.id,
                leadId: newLead.id,
                visitId: visit.id,
                type: NotificationType.VISIT_SCHEDULED_ADMIN,
                title: 'Visit scheduled',
                message: `Lead: ${newLead.name} visit scheduled at ${parsedScheduledAt.toISOString()} and assigned to ${visitAssignee.fullName}.`,
                scheduledFor: parsedScheduledAt,
              })),
            });
          }

          const existingVisitTeamAssignment = await tx.leadAssignment.findFirst({ where: { leadId: newLead.id, department: LeadAssignmentDepartment.VISIT_TEAM } });
          const targetSeniorCrmUserId = seniorCrmUserId ?? (weekly.automationEnabled ? weekly.current?.id : null) ?? null;
          if (targetSeniorCrmUserId) {
            const existingSrAssignment = await tx.leadAssignment.findFirst({ where: { leadId: newLead.id, department: LeadAssignmentDepartment.SR_CRM } });
            if (existingSrAssignment) {
              await tx.leadAssignment.update({ where: { id: existingSrAssignment.id }, data: { userId: targetSeniorCrmUserId } });
            } else {
              await tx.leadAssignment.create({ data: { leadId: newLead.id, userId: targetSeniorCrmUserId, department: LeadAssignmentDepartment.SR_CRM } });
            }
          }

          if (existingVisitTeamAssignment) {
            await tx.leadAssignment.update({ where: { id: existingVisitTeamAssignment.id }, data: { userId: visitTeamUserId } });
          } else {
            await tx.leadAssignment.create({ data: { leadId: newLead.id, userId: visitTeamUserId, department: LeadAssignmentDepartment.VISIT_TEAM } });
          }

          if (notes) {
            await tx.note.create({ data: { leadId: newLead.id, userId: authResult.actorUserId, content: notes } });
          }

          await logLeadStageChanged(tx, { leadId: newLead.id, userId: authResult.actorUserId, from: newLead.stage, to: LeadStage.VISIT_PHASE, reason });
          await logActivity(tx, { leadId: newLead.id, userId: authResult.actorUserId, type: ActivityType.VISIT_SCHEDULED, description: `Visit ${visit.id} scheduled at ${parsedScheduledAt.toISOString()} and assigned to ${visitAssignee.fullName}. Reason: ${reason}` });
          await logUserAssigned(tx, { leadId: newLead.id, userId: authResult.actorUserId, leadName: `${visitAssignee.fullName} assigned as visit lead` });
          await autoCompletePendingFollowups(tx, { leadId: newLead.id, userId: authResult.actorUserId, action: 'visit scheduled' });
        } catch (err) {
          // Bubble up known errors to abort transaction
          throw err;
        }
      }

      return newLead;
    });
    // console.log('✨ [POST /api/lead] - Lead and activity log created successfully');

    // Send FCM push notification to the assigned visit team member's device
    // if a visit was scheduled during lead creation.
    const shouldSchedule = Boolean(body.scheduleVisit);
    if (shouldSchedule) {
      try {
        const visitBody: CreateLeadVisitBody = isRecord(body.visit) ? body.visit : {};
        const visitTeamUserId = toOptionalString(visitBody.visitTeamUserId);
        const scheduledAtRaw = toOptionalString(visitBody.scheduledAt);
        const parsedScheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : null;
        if (visitTeamUserId && parsedScheduledAt && !Number.isNaN(parsedScheduledAt.getTime())) {
          await sendPushToUser(
            visitTeamUserId,
            'New visit assigned',
            `You have been assigned a new visit for ${lead.name}.`,
            { type: 'VISIT_ASSIGNED', leadId: lead.id }
          );
        }
      } catch (pushErr) {
        console.error('[POST /api/lead] Failed to send push notification:', pushErr);
      }
    }

    // Return 201 Created with the new lead data
    return NextResponse.json(
      { success: true, data: lead, message: 'Lead created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ [POST /api/lead] - Error:', error);

    // Handle specific Prisma unique constraint violation (P2002 error code)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'A lead with this phone number already exists' },
        { status: 409 }
      );
    }

    const knownErrorResponse = getCreateLeadErrorResponse(error);
    if (knownErrorResponse) {
      return knownErrorResponse;
    }

    // Return generic 500 error for other unexpected errors
    return NextResponse.json(
      { success: false, error: 'Failed to create lead' },
      { status: 500 }
    );
  }
}
