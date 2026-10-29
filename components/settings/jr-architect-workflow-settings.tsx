'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, FileCheck, Save, SlidersHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'

type JrArchitectWorkflowControl = {
  completeResubmissionEnabled: boolean
  createdAt: string
  updatedAt: string
}

type SettingsResponse = {
  success: boolean
  data?: {
    control: JrArchitectWorkflowControl
  }
  error?: string
  message?: string
}

export function JrArchitectWorkflowSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [completeResubmissionEnabled, setCompleteResubmissionEnabled] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setStatusError(null)
    try {
      const response = await fetch('/api/jr-architecture/workflow-settings', { cache: 'no-store' })
      const payload = (await response.json()) as SettingsResponse
      if (!response.ok || !payload.success || !payload.data?.control) {
        throw new Error(payload.error ?? 'Failed to load JR Architect workflow settings')
      }
      setCompleteResubmissionEnabled(payload.data.control.completeResubmissionEnabled)
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Failed to load JR Architect workflow settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  const save = async () => {
    setSaving(true)
    setStatusMessage(null)
    setStatusError(null)

    try {
      const response = await fetch('/api/jr-architecture/workflow-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completeResubmissionEnabled }),
      })
      const payload = (await response.json()) as SettingsResponse
      if (!response.ok || !payload.success || !payload.data?.control) {
        throw new Error(payload.error ?? 'Failed to save JR Architect workflow settings')
      }
      setCompleteResubmissionEnabled(payload.data.control.completeResubmissionEnabled)
      setStatusMessage(payload.message ?? 'Settings updated successfully')
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Failed to save JR Architect workflow settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
            JR Architect Workflow Settings
          </CardTitle>
          <CardDescription>
            Configure file resubmission policies and stage permissions for the Junior Architecture department.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileCheck className="h-4 w-4 text-primary" />
            Complete Resubmission Policy
          </CardTitle>
          <CardDescription>
            Control whether JR Architects are permitted to upload revised files after a lead has advanced past CAD Phase.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between rounded-lg border border-border px-4 py-3 cursor-pointer hover:bg-muted/40 transition">
            <div className="space-y-1 pr-4">
              <p className="text-sm font-medium text-foreground">Complete Resubmission</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>When ON:</strong> JR Architects are allowed to upload updated files for <em>any lead stage</em> from My Work. Uploads attach updated files without disrupting or resetting the lead stage.
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>When OFF (Default):</strong> JR Architects can resubmit while in Review Center and CAD Phase. Resubmission is locked once the lead reaches Quotation or upper phases.
              </p>
            </div>
            <Switch
              checked={completeResubmissionEnabled}
              onCheckedChange={setCompleteResubmissionEnabled}
              disabled={loading || saving}
            />
          </label>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button onClick={() => void save()} disabled={loading || saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
            <Button variant="outline" onClick={() => void loadSettings()} disabled={loading || saving}>
              Refresh
            </Button>
          </div>

          {statusMessage ? (
            <div className="rounded-md border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
              {statusMessage}
            </div>
          ) : null}
          {statusError ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{statusError}</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
