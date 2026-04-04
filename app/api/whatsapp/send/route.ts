import { NextRequest, NextResponse } from 'next/server'

import { requireDatabaseRoles } from '@/lib/authz'

export const runtime = 'nodejs'
export const preferredRegion = 'sin1'

type SendBody = {
  phone?: unknown
  message?: unknown
  leadId?: unknown
}

function toOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizePhone(value: string): string | null {
  const digits = value.replace(/\D/g, '')
  if (!digits) return null
  return digits
}

function getWawpSendConfig() {
  const baseUrl = (process.env.WAWP_API_BASE_URL ?? 'https://wawp.net/api').trim().replace(/\/$/, '')
  const explicitSendUrl = process.env.WAWP_SEND_URL?.trim()
  const sendUrl = explicitSendUrl && explicitSendUrl.length > 0 ? explicitSendUrl : `${baseUrl}/send`

  return {
    sendUrl,
    instanceId: process.env.WAWP_INSTANCE_ID?.trim() ?? '',
    accessToken: process.env.WAWP_ACCESS_TOKEN?.trim() ?? '',
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireDatabaseRoles([])
  if (!authResult.ok) return authResult.response

  let body: SendBody
  try {
    body = (await request.json()) as SendBody
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const phoneRaw = toOptionalString(body.phone)
  const message = toOptionalString(body.message)
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null

  if (!phone) {
    return NextResponse.json({ success: false, error: 'Valid phone is required' }, { status: 400 })
  }

  if (!message) {
    return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 })
  }

  const config = getWawpSendConfig()
  if (!config.instanceId || !config.accessToken) {
    return NextResponse.json(
      { success: false, error: 'WAWP credentials are not configured (WAWP_INSTANCE_ID / WAWP_ACCESS_TOKEN)' },
      { status: 500 },
    )
  }

  const payload = {
    instance_id: config.instanceId,
    access_token: config.accessToken,
    phone,
    number: phone,
    to: phone,
    message,
    text: message,
  }

  try {
    const response = await fetch(config.sendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${config.accessToken}`,
        'x-access-token': config.accessToken,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    })

    const responseText = await response.text()
    let data: unknown = null

    try {
      data = responseText ? JSON.parse(responseText) : null
    } catch {
      data = responseText
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'WAWP send failed',
          providerStatus: response.status,
          providerResponse: data,
        },
        { status: 502 },
      )
    }

    return NextResponse.json({
      success: true,
      message: 'WhatsApp message sent',
      data,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to call WAWP send API',
      },
      { status: 500 },
    )
  }
}
