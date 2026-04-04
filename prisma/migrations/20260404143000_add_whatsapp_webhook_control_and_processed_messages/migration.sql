CREATE TABLE "WhatsAppWebhookControl" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "lastWebhookAt" TIMESTAMP(3),
  "lastWebhookStatus" TEXT,
  "lastWebhookError" TEXT,
  "lastProcessedMessages" INTEGER NOT NULL DEFAULT 0,
  "lastCreatedLeads" INTEGER NOT NULL DEFAULT 0,
  "lastSkippedExistingPhone" INTEGER NOT NULL DEFAULT 0,
  "lastSkippedNoPhone" INTEGER NOT NULL DEFAULT 0,
  "lastSkippedDuplicateMessage" INTEGER NOT NULL DEFAULT 0,
  "totalWebhookEvents" INTEGER NOT NULL DEFAULT 0,
  "totalProcessedMessages" INTEGER NOT NULL DEFAULT 0,
  "totalCreatedLeads" INTEGER NOT NULL DEFAULT 0,
  "totalSkippedExistingPhone" INTEGER NOT NULL DEFAULT 0,
  "totalSkippedNoPhone" INTEGER NOT NULL DEFAULT 0,
  "totalSkippedDuplicateMessage" INTEGER NOT NULL DEFAULT 0,
  "jrCrmRoundRobinOffset" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WhatsAppWebhookControl_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WhatsAppProcessedMessage" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "phone" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WhatsAppProcessedMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsAppProcessedMessage_messageId_key" ON "WhatsAppProcessedMessage"("messageId");
CREATE INDEX "WhatsAppProcessedMessage_createdAt_idx" ON "WhatsAppProcessedMessage"("createdAt");
