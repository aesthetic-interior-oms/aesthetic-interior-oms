import prisma from '@/lib/prisma'

export const STANDARD_DEPARTMENTS = [
  { name: 'ADMIN', description: 'System administration' },
  { name: 'SR_CRM', description: 'Senior CRM department' },
  { name: 'JR_CRM', description: 'Junior CRM department' },
  { name: 'QUOTATION_TEAM', description: 'Quotation department' },
  { name: 'VISIT_TEAM', description: 'Visit team department' },
  { name: 'SPECIALIST_DESIGN_CONSULTANTS', description: 'Specialist Design Consultants department (partial visit team)' },
  { name: 'JR_ARCHITECT', description: 'Junior Architect department' },
  { name: '3D_VISUALIZER', description: '3D Visualizer department' },
  { name: 'ACCOUNTS', description: 'Accounts and finance department' },
  { name: 'PROJECT_CORDINATOR', description: 'Project Coordinator department' },
  { name: 'PROCUREMENT', description: 'Procurement department (material purchase, vendor management & delivery)' },
  { name: 'BOQ', description: 'BOQ department (material requisitions chart & quantity takeoff based on quotation)' },
  // Field & Execution departments
  { name: 'PROJECT_ENGINEER', description: 'Project Engineer department' },
  { name: 'SITE_ENGINEER', description: 'Site Engineer department' },
  { name: 'ELECTRICIAN', description: 'Electrician department' },
  { name: 'FACTORY_MANAGER', description: 'Factory Manager department' },
  { name: 'IMPLEMENTATION_TEAM', description: 'Implementation Team department' },
  // Operations departments
  { name: 'CARPENTRY', description: 'Carpentry & Fabrication department' },
  { name: 'PLUMBING', description: 'Plumbing department' },
  { name: 'CIVIL_WORKS', description: 'Civil Works department' },
  { name: 'LOGISTICS_DELIVERY', description: 'Logistics & Delivery department' },
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
