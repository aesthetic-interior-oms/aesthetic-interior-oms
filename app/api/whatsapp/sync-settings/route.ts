import { NextRequest, NextResponse } from 'next/server'

import { requireDatabaseRoles } from '@/lib/authz'
import { getWhatsAppControlState, setWhatsAppEnabled } from '@/lib/whatsapp-control'

export const runtime = 'nodejs'
export const preferredRegion = 'sin1'

type UpdateBody = {
  enabled?: unknown
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

export async function GET() {
  const authResult = await requireDatabaseRoles([])
  if (!authResult.ok) return authResult.response

  const control = await getWhatsAppControlState()

  return NextResponse.json({
    success: true,
    data: {
      control,
      config: {
        verifyTokenConfigured: Boolean(
          process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || process.env.META_WEBHOOK_VERIFY_TOKEN,
        ),
        appSecretConfigured: Boolean(process.env.META_APP_SECRET),
        wawpSecretConfigured: Boolean(process.env.WAWP_WEBHOOK_SECRET),
      },
    },
  })
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireDatabaseRoles([])
  if (!authResult.ok) return authResult.response

  let body: UpdateBody
  try {
    body = (await request.json()) as UpdateBody
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const enabled = toOptionalBoolean(body.enabled)
  if (typeof enabled !== 'boolean') {
    return NextResponse.json({ success: false, error: 'enabled must be boolean' }, { status: 400 })
  }

  const control = await setWhatsAppEnabled(enabled)

  return NextResponse.json({
    success: true,
    data: {
      control,
      config: {
        verifyTokenConfigured: Boolean(
          process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || process.env.META_WEBHOOK_VERIFY_TOKEN,
        ),
        appSecretConfigured: Boolean(process.env.META_APP_SECRET),
        wawpSecretConfigured: Boolean(process.env.WAWP_WEBHOOK_SECRET),
      },
    },
    message: `WhatsApp ingestion ${enabled ? 'enabled' : 'disabled'}`,
  })
}
