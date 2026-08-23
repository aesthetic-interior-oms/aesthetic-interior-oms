import prisma from './lib/prisma';

async function main() {
  try {
    const leads = await prisma.lead.findMany({
      where: {
        AND: [
          {
            OR: [
              {
                stage: 'QUOTATION_PHASE',
                subStatus: {
                  in: [
                    'QUOTATION_ASSIGNED',
                    'QUOTATION_WORKING',
                    'QUOTATION_APPROVED',
                  ],
                },
              },
              {
                stage: 'BUDGET_PHASE',
                subStatus: 'BUDGET_MEETING_SET',
              },
            ],
          },
        ]
      },
      include: {
        meetingEvents: {
          where: { type: 'FIRST_MEETING' },
          select: {
            id: true,
            title: true,
            startsAt: true,
            notes: true,
          },
          orderBy: { startsAt: 'desc' },
          take: 1,
        },
        visits: {
          where: { status: 'COMPLETED' },
          orderBy: { scheduledAt: 'desc' },
          take: 1,
          select: {
            id: true,
            scheduledAt: true,
            projectSqft: true,
            assignedTo: {
              select: {
                id: true,
                fullName: true,
              },
            },
            supportAssignments: {
              select: {
                supportUser: {
                  select: {
                    id: true,
                    fullName: true,
                  },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      }
    });
    console.log("Found leads:", leads.length);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
