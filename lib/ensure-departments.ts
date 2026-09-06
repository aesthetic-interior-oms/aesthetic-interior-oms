import prisma from '@/lib/prisma'

export const STANDARD_DEPARTMENTS = [
  { name: 'ADMIN', description: 'System administration' },
  { name: 'SR_CRM', description: 'Senior CRM department' },
  { name: 'JR_CRM', description: 'Junior CRM department' },
  { name: 'QUOTATION', description: 'Quotation department' },
  { name: 'VISIT_TEAM', description: 'Visit team department' },
  { name: 'JR_ARCHITECT', description: 'Junior Architect department' },
  { name: 'VISUALIZER_3D', description: '3D Visualizer department' },
  { name: 'ACCOUNTS', description: 'Accounts and finance department' },
  { name: 'PROJECT_COORDINATOR', description: 'Project Coordinator department' },
] as const

export async function ensureStandardDepartmentsExist() {
  try {
    for (const dept of STANDARD_DEPARTMENTS) {
      await prisma.department.upsert({
        where: { name: dept.name },
        update: {},
        create: {
          name: dept.name,
          description: dept.description,
        },
      })
    }
  } catch (error) {
    console.error('Failed to ensure standard departments exist:', error)
  }
}
