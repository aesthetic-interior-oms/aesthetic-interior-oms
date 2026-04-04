import { NextResponse } from 'next/server'

import { requireDatabaseRoles } from '@/lib/authz'
import { getWhatsAppControlState } from '@/lib/whatsapp-control'

export const runtime = 'nodejs'
export const preferredRegion = 'sin1'

export async function GET() {
  const authResult = await requireDatabaseRoles([])
  if (!authResult.ok) return authResult.response

  const control = await getWhatsAppControlState()

  return NextResponse.json({
    success: true,
    data: {
      checkedAt: new Date().toISOString(),
      webhookPath: '/api/webhooks/whatsapp',
      config: {
        verifyTokenConfigured: Boolean(
          process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || process.env.META_WEBHOOK_VERIFY_TOKEN,
        ),
        appSecretConfigured: Boolean(process.env.META_APP_SECRET),
        wawpSecretConfigured: Boolean(process.env.WAWP_WEBHOOK_SECRET),
      },
      control,
    },
  })
}
