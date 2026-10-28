import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import {
  LeadAssignmentDepartment,
  LeadMeetingEventType,
  LeadPhaseTaskStatus,
  LeadPhaseType,
  LeadStage,
  LeadSubStatus,
  Prisma,
} from '@/generated/prisma/client'
import { requireDatabaseRoles } from '@/lib/authz'
import { hasJrArchitectureLeaderRole } from '@/lib/jr-architecture-roles'
import { normalizeMonthKey } from '@/lib/quotation-performance'

export const runtime = 'nodejs'
export const preferredRegion = 'sin1'

export async function GET(request: Request) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
    const actorRoles = authResult.actorRoles ?? []
    const isJrArchitect = actorDepartments.has('JR_ARCHITECT')
    const isAdmin = actorDepartments.has('ADMIN')
    const isSeniorCrm = actorDepartments.has('SR_CRM')
    const isLeader = isJrArchitect && hasJrArchitectureLeaderRole(actorRoles)

    if (!isJrArchitect && !isAdmin && !isSeniorCrm) {
      return NextResponse.json(
        { success: false, error: 'Only JR Architect, Senior CRM, or Admin can access CAD tasks' },
        { status: 403 },
      )
    }

    const { searchParams } = new URL(request.url)
    const includeHistory = searchParams.get('includeHistory') === '1'
    const requestedMonth = searchParams.get('month')
    const monthKey = requestedMonth ? normalizeMonthKey(requestedMonth) : null

    // For active Assigned Work:
    // 1. Must be in CAD_PHASE
    // 2. subStatus must be active CAD status: CAD_ASSIGNED, CAD_WORKING, or CAD_COMPLETED (under review)
    //    Once approved (CAD_APPROVED) or moved out of CAD_PHASE, it is excluded!
    // For My Work (includeHistory):
    // Show all leads assigned to this JR architect or where they submitted CAD work, across all stages
    const activeSubStatuses: LeadSubStatus[] = [
      LeadSubStatus.CAD_ASSIGNED,
      LeadSubStatus.CAD_WORKING,
      LeadSubStatus.CAD_COMPLETED,
    ]

    const whereCondition: Prisma.LeadWhereInput = includeHistory
      ? {
          OR: [
            {
              assignments: {
                some: {
                  department: LeadAssignmentDepartment.JR_ARCHITECT,
                  userId: authResult.actorUserId,
                },
              },
            },
            {
              cadWorkSubmissions: {
                some: {
                  submittedById: authResult.actorUserId,
                },
              },
            },
          ],
        }
      : (isAdmin || isLeader)
        ? {
            stage: LeadStage.CAD_PHASE,
            subStatus: { in: activeSubStatuses },
          }
        : {
            stage: LeadStage.CAD_PHASE,
            subStatus: { in: activeSubStatuses },
            assignments: {
              some: {
                department: LeadAssignmentDepartment.JR_ARCHITECT,
                userId: authResult.actorUserId,
              },
            },
          }

    const leads = await prisma.lead.findMany({
      where: whereCondition,
      select: {
        id: true,
        name: true,
        phone: true,
        location: true,
        stage: true,
        subStatus: true,
        updated_at: true,
        created_at: true,
        budget: true,
        assignments: {
          where: {
            department: {
              in: [
                LeadAssignmentDepartment.JR_ARCHITECT,
                LeadAssignmentDepartment.SR_CRM,
                LeadAssignmentDepartment.QUOTATION,
              ],
            },
          },
          select: {
            department: true,
            user: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            url: true,
            fileType: true,
            category: true,
            sizeBytes: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        meetingEvents: {
          where: { type: LeadMeetingEventType.FIRST_MEETING },
          select: {
            id: true,
            title: true,
            notes: true,
            startsAt: true,
          },
          orderBy: { startsAt: 'desc' },
          take: 1,
        },
        visits: {
          select: {
            id: true,
            projectSqft: true,
            scheduledAt: true,
            notes: true,
            status: true,
            assignedTo: {
              select: { id: true, fullName: true },
            },
          },
          orderBy: { scheduledAt: 'desc' },
          take: 1,
        },
        phaseTasks: {
          where: { phaseType: LeadPhaseType.CAD },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            currentReviewRound: true,
            dueAt: true,
            completedAt: true,
            workDetails: true,
          },
        },
        cadWorkSubmissions: {
          orderBy: { submittedAt: 'desc' },
          select: {
            id: true,
            note: true,
            submittedAt: true,
            submittedById: true,
            submittedBy: {
              select: { id: true, fullName: true, email: true },
            },
            files: {
              select: {
                id: true,
                fileName: true,
                url: true,
                fileType: true,
                cadFileType: true,
                sizeBytes: true,
                createdAt: true,
              },
            },
          },
          take: includeHistory ? 20 : 5,
        },
      },
      orderBy: { updated_at: 'desc' },
    })

    const tasksData = leads.map((lead) => {
      const visit = lead.visits[0]
      const fallbackSqft = visit?.projectSqft ?? null
      const visitDate = visit?.scheduledAt ? visit.scheduledAt.toISOString() : null
      const visitMonthKey = visit?.scheduledAt
        ? `${visit.scheduledAt.getFullYear()}-${String(visit.scheduledAt.getMonth() + 1).padStart(2, '0')}`
        : null

      const srCrm = lead.assignments.find(
        (a) => a.department === LeadAssignmentDepartment.SR_CRM,
      )?.user ?? null

      const jrArchitect = lead.assignments.find(
        (a) => a.department === LeadAssignmentDepartment.JR_ARCHITECT,
      )?.user ?? null

      const latestMeeting = lead.meetingEvents[0]
        ? {
            id: lead.meetingEvents[0].id,
            title: lead.meetingEvents[0].title,
            notes: lead.meetingEvents[0].notes,
            startsAt: lead.meetingEvents[0].startsAt.toISOString(),
          }
        : null

      const phaseTask = lead.phaseTasks[0] ?? null
      const isRework =
        (lead.subStatus === LeadSubStatus.CAD_ASSIGNED || lead.subStatus === LeadSubStatus.CAD_WORKING) &&
        Boolean(phaseTask && phaseTask.currentReviewRound > 0)

      const canStart = lead.stage === LeadStage.CAD_PHASE && lead.subStatus === LeadSubStatus.CAD_ASSIGNED
      const canSubmit =
        lead.stage === LeadStage.CAD_PHASE &&
        (lead.subStatus === LeadSubStatus.CAD_WORKING || isRework)

      return {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        location: lead.location,
        stage: lead.stage,
        subStatus: lead.subStatus,
        updatedAt: lead.updated_at.toISOString(),
        createdAt: lead.created_at.toISOString(),
        budget: lead.budget,
        visitDate,
        visitMonthKey,
        projectSqft: fallbackSqft,
        srCrmAssignee: srCrm,
        jrArchitectAssignee: jrArchitect,
        latestFirstMeeting: latestMeeting,
        latestPhaseTask: phaseTask
          ? {
              id: phaseTask.id,
              status: phaseTask.status,
              currentReviewRound: phaseTask.currentReviewRound,
              dueAt: phaseTask.dueAt ? phaseTask.dueAt.toISOString() : null,
              completedAt: phaseTask.completedAt ? phaseTask.completedAt.toISOString() : null,
              workDetails: phaseTask.workDetails,
            }
          : null,
        isRework,
        canStart,
        canSubmit,
        attachments: lead.attachments.map((att) => ({
          id: att.id,
          fileName: att.fileName,
          url: att.url,
          fileType: att.fileType,
          category: att.category,
          sizeBytes: att.sizeBytes,
          createdAt: att.createdAt.toISOString(),
        })),
        submissions: lead.cadWorkSubmissions.map((sub) => ({
          id: sub.id,
          note: sub.note,
          submittedAt: sub.submittedAt.toISOString(),
          submittedById: sub.submittedById,
          submittedBy: sub.submittedBy,
          files: sub.files.map((file) => ({
            id: file.id,
            fileName: file.fileName,
            url: file.url,
            fileType: file.fileType,
            cadFileType: file.cadFileType,
            sizeBytes: file.sizeBytes,
            createdAt: file.createdAt.toISOString(),
          })),
        })),
      }
    })

    // Filter by visitMonthKey if provided
    const filteredTasks = monthKey
      ? tasksData.filter((task) =>
          monthKey === 'NO_VISIT' ? !task.visitMonthKey : task.visitMonthKey === monthKey,
        )
      : tasksData

    return NextResponse.json({
      success: true,
      data: filteredTasks,
      total: filteredTasks.length,
    })
  } catch (error) {
    console.error('Failed to load CAD assigned tasks:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    )
  }
}
