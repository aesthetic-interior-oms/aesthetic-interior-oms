'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { CheckCircle2, RefreshCw, Save } from 'lucide-react'

type WhatsAppControl = {
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
}

type WhatsAppConfig = {
  verifyTokenConfigured: boolean
  appSecretConfigured: boolean
  wawpSecretConfigured: boolean
}

type WhatsAppSettingsResponse = {
  success: boolean
  data?: {
    control: WhatsAppControl
    config: WhatsAppConfig
  }
  error?: string
  message?: string
}

function formatDate(value: string | null): string {
  if (!value) return 'Never'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleString()
}

export function WhatsAppLeadSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)

  const [control, setControl] = useState<WhatsAppControl | null>(null)
  const [config, setConfig] = useState<WhatsAppConfig | null>(null)
  const [enabled, setEnabled] = useState(true)

  const loadSettings = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setStatusError(null)

    try {
      const response = await fetch('/api/whatsapp/sync-settings', { cache: 'no-store' })
      const payload = (await response.json()) as WhatsAppSettingsResponse

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? 'Failed to load WhatsApp settings')
      }

      setControl(payload.data.control)
      setConfig(payload.data.config)
      setEnabled(payload.data.control.enabled)
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Failed to load WhatsApp settings')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  const hasUnsavedChanges = useMemo(() => {
    if (!control) return false
    return enabled !== control.enabled
  }, [control, enabled])

  const saveSettings = async () => {
    setSaving(true)
    setStatusMessage(null)
    setStatusError(null)

    try {
      const response = await fetch('/api/whatsapp/sync-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })

      const payload = (await response.json()) as WhatsAppSettingsResponse
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? 'Failed to save WhatsApp settings')
      }

      setControl(payload.data.control)
      setConfig(payload.data.config)
      setEnabled(payload.data.control.enabled)
      setStatusMessage(payload.message ?? 'WhatsApp settings saved.')
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Failed to save WhatsApp settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !control || !config) {
    return (
      <Card className="border-border">
        <CardContent className="py-8 text-sm text-muted-foreground">Loading WhatsApp lead settings...</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>WhatsApp Lead Creation Control</CardTitle>
              <CardDescription>
                Monitor WAWP webhook health, lead creation counters, and control ingestion.
              </CardDescription>
            </div>
            <Badge className={control.enabled ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
              {control.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">Last Webhook</p>
              <p className="mt-1 text-sm font-medium text-foreground">{formatDate(control.lastWebhookAt)}</p>
              <p className="mt-2 text-xs text-muted-foreground">Status: {control.lastWebhookStatus ?? 'N/A'}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Last processed: {control.lastProcessedMessages} | Last created: {control.lastCreatedLeads}
              </p>
            </div>

            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">Total Counters</p>
              <p className="mt-1 text-xs text-muted-foreground">Webhook events: {control.totalWebhookEvents}</p>
              <p className="mt-1 text-xs text-muted-foreground">Messages processed: {control.totalProcessedMessages}</p>
              <p className="mt-1 text-xs text-muted-foreground">Leads created: {control.totalCreatedLeads}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Skipped duplicate message: {control.totalSkippedDuplicateMessage}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Skipped existing phone: {control.totalSkippedExistingPhone}</p>
              <p className="mt-1 text-xs text-muted-foreground">Skipped no phone: {control.totalSkippedNoPhone}</p>
            </div>
          </div>

          <div className="rounded-lg border border-border p-4 text-xs text-muted-foreground">
            <p>Webhook path: /api/webhooks/whatsapp</p>
            <p className="mt-1">Verify token configured: {config.verifyTokenConfigured ? 'Yes' : 'No'}</p>
            <p className="mt-1">Meta app secret configured: {config.appSecretConfigured ? 'Yes' : 'No'}</p>
            <p className="mt-1">WAWP webhook secret configured: {config.wawpSecretConfigured ? 'Yes' : 'No'}</p>
            <p className="mt-1">JR CRM round-robin pointer: {control.jrCrmRoundRobinOffset}</p>
          </div>

          {control.lastWebhookError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              Last error: {control.lastWebhookError}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Enable WhatsApp lead creation</p>
              <p className="text-xs text-muted-foreground">Master switch for WAWP webhook ingestion.</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={saveSettings} disabled={saving || !hasUnsavedChanges} className="gap-2">
              {saving ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save WhatsApp Settings
            </Button>
            <Button variant="outline" onClick={() => void loadSettings(true)} disabled={refreshing} className="gap-2">
              {refreshing ? <RefreshCw className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Refresh Health
            </Button>
          </div>

          {statusMessage && (
            <div className="rounded-md border border-green-200 bg-green-50 p-3 text-xs text-green-700">
              {statusMessage}
            </div>
          )}
          {statusError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {statusError}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
