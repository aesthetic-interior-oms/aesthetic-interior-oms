import prisma from '@/lib/prisma'

const SINGLETON_ID = 'singleton'

export type JrArchitectWorkflowControlState = {
  completeResubmissionEnabled: boolean
  createdAt: Date
  updatedAt: Date
}

export async function getJrArchitectWorkflowControlState(): Promise<JrArchitectWorkflowControlState> {
  const existing = await prisma.jrArchitectWorkflowControl.findUnique({
    where: { id: SINGLETON_ID },
  })

  if (existing) {
    return {
      completeResubmissionEnabled: existing.completeResubmissionEnabled,
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
    }
  }

  const created = await prisma.jrArchitectWorkflowControl.create({
    data: {
      id: SINGLETON_ID,
      completeResubmissionEnabled: false,
    },
  })

  return {
    completeResubmissionEnabled: created.completeResubmissionEnabled,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  }
}

export async function setJrArchitectCompleteResubmissionEnabled(
  completeResubmissionEnabled: boolean,
): Promise<JrArchitectWorkflowControlState> {
  const updated = await prisma.jrArchitectWorkflowControl.upsert({
    where: { id: SINGLETON_ID },
    create: {
      id: SINGLETON_ID,
      completeResubmissionEnabled,
    },
    update: {
      completeResubmissionEnabled,
    },
  })

  return {
    completeResubmissionEnabled: updated.completeResubmissionEnabled,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  }
}
