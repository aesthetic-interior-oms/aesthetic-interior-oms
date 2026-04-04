import 'server-only'

import prisma from '@/lib/prisma'

const SETTINGS_ROW_ID = 'default'

type ControlRow = {
  enabled: boolean
  lastWebhookAt: Date | null
  lastWebhookStatus: string | null
  lastWebhookError: string | null
  lastProcessedMessages: number
  lastCreatedLeads: number
  lastSkippedExistingPhone: number
  lastSkippedNoPhone: number
  lastSkippedDuplicateMessage: number
  totalWebhookEvents: number
  totalProcessedMessages: number
  totalCreatedLeads: number
  totalSkippedExistingPhone: number
  totalSkippedNoPhone: number
  totalSkippedDuplicateMessage: number
  jrCrmRoundRobinOffset: number
  createdAt: Date
  updatedAt: Date
}

export type WhatsAppControlState = {
  enabled: boolean
  lastWebhookAt: string | null
  lastWebhookStatus: string | null
  lastWebhookError: string | null
  lastProcessedMessages: number
  lastCreatedLeads: number
  lastSkippedExistingPhone: number
  lastSkippedNoPhone: number
  lastSkippedDuplicateMessage: number
  totalWebhookEvents: number
  totalProcessedMessages: number
  totalCreatedLeads: number
  totalSkippedExistingPhone: number
  totalSkippedNoPhone: number
  totalSkippedDuplicateMessage: number
  jrCrmRoundRobinOffset: number
  createdAt: string
  updatedAt: string
}

export type WhatsAppRecordResultInput = {
  processedMessages: number
  createdLeads: number
  skippedExistingPhone: number
  skippedNoPhone: number
  skippedDuplicateMessage: number
}

function serialize(row: ControlRow): WhatsAppControlState {
  return {
    enabled: row.enabled,
    lastWebhookAt: row.lastWebhookAt?.toISOString() ?? null,
    lastWebhookStatus: row.lastWebhookStatus,
    lastWebhookError: row.lastWebhookError,
    lastProcessedMessages: row.lastProcessedMessages,
    lastCreatedLeads: row.lastCreatedLeads,
    lastSkippedExistingPhone: row.lastSkippedExistingPhone,
    lastSkippedNoPhone: row.lastSkippedNoPhone,
    lastSkippedDuplicateMessage: row.lastSkippedDuplicateMessage,
    totalWebhookEvents: row.totalWebhookEvents,
    totalProcessedMessages: row.totalProcessedMessages,
    totalCreatedLeads: row.totalCreatedLeads,
    totalSkippedExistingPhone: row.totalSkippedExistingPhone,
    totalSkippedNoPhone: row.totalSkippedNoPhone,
    totalSkippedDuplicateMessage: row.totalSkippedDuplicateMessage,
    jrCrmRoundRobinOffset: row.jrCrmRoundRobinOffset,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function ensureWhatsAppControlRow() {
  return prisma.whatsAppWebhookControl.upsert({
    where: { id: SETTINGS_ROW_ID },
    create: { id: SETTINGS_ROW_ID, enabled: true },
    update: {},
  })
}

export async function getWhatsAppControlState(): Promise<WhatsAppControlState> {
  const row = await ensureWhatsAppControlRow()
  return serialize(row)
}

export async function setWhatsAppEnabled(enabled: boolean): Promise<WhatsAppControlState> {
  await ensureWhatsAppControlRow()
  const row = await prisma.whatsAppWebhookControl.update({
    where: { id: SETTINGS_ROW_ID },
    data: { enabled },
  })
  return serialize(row)
}

export async function recordWhatsAppWebhookResult(input: WhatsAppRecordResultInput): Promise<void> {
  await ensureWhatsAppControlRow()
  await prisma.whatsAppWebhookControl.update({
    where: { id: SETTINGS_ROW_ID },
    data: {
      lastWebhookAt: new Date(),
      lastWebhookStatus: 'SUCCESS',
      lastWebhookError: null,
      lastProcessedMessages: input.processedMessages,
      lastCreatedLeads: input.createdLeads,
      lastSkippedExistingPhone: input.skippedExistingPhone,
      lastSkippedNoPhone: input.skippedNoPhone,
      lastSkippedDuplicateMessage: input.skippedDuplicateMessage,
      totalWebhookEvents: { increment: 1 },
      totalProcessedMessages: { increment: input.processedMessages },
      totalCreatedLeads: { increment: input.createdLeads },
      totalSkippedExistingPhone: { increment: input.skippedExistingPhone },
      totalSkippedNoPhone: { increment: input.skippedNoPhone },
      totalSkippedDuplicateMessage: { increment: input.skippedDuplicateMessage },
    },
  })
}

export async function recordWhatsAppWebhookError(errorMessage: string): Promise<void> {
  await ensureWhatsAppControlRow()
  await prisma.whatsAppWebhookControl.update({
    where: { id: SETTINGS_ROW_ID },
    data: {
      lastWebhookAt: new Date(),
      lastWebhookStatus: 'FAILED',
      lastWebhookError: errorMessage.slice(0, 2000),
      totalWebhookEvents: { increment: 1 },
    },
  })
}

export async function getAndAdvanceWhatsAppRoundRobinOffset(agentCount: number): Promise<number> {
  if (agentCount <= 0) return 0

  const control = await ensureWhatsAppControlRow()
  const selectedOffset = Math.max(0, control.jrCrmRoundRobinOffset) % agentCount
  const nextOffset = (selectedOffset + 1) % agentCount

  await prisma.whatsAppWebhookControl.update({
    where: { id: SETTINGS_ROW_ID },
    data: { jrCrmRoundRobinOffset: nextOffset },
  })

  return selectedOffset
}
