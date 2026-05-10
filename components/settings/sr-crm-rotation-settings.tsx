'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, CalendarClock, RefreshCw, Save } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

type SeniorCrmUser = {
  id: string
  fullName: string
  email: string | null
}

type WeeklySeniorCrm = {
  automationEnabled: boolean
  current: SeniorCrmUser | null
  selected: SeniorCrmUser | null
  next: SeniorCrmUser | null
  weekStart: string
}

type SrCrmRotationResponse = {
  success: boolean
  data?: WeeklySeniorCrm & {
    seniors: SeniorCrmUser[]
  }
  error?: string
  message?: string
}

function formatWeekRange(weekStartIso?: string) {
  if (!weekStartIso) return 'Current Saturday to Thursday week'
  const start = new Date(weekStartIso)
  if (Number.isNaN(start.getTime())) return 'Current Saturday to Thursday week'
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 5)
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })}`
}

export function SrCrmRotationSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [automationEnabled, setAutomationEnabled] = useState(true)
  const [selectedSeniorCrmId, setSelectedSeniorCrmId] = useState('')
  const [seniors, setSeniors] = useState<SeniorCrmUser[]>([])
  const [weekly, setWeekly] = useState<WeeklySeniorCrm | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)

  const selectedSenior = useMemo(
    () => seniors.find((senior) => senior.id === selectedSeniorCrmId) ?? null,
    [selectedSeniorCrmId, seniors],
  )

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setStatusError(null)
    try {
      const response = await fetch('/api/admin/sr-crm-rotation', { cache: 'no-store' })
      const payload = (await response.json()) as SrCrmRotationResponse
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? 'Failed to load Senior CRM automation settings')
      }

      setSeniors(payload.data.seniors)
      setWeekly(payload.data)
      setAutomationEnabled(payload.data.automationEnabled)
      setSelectedSeniorCrmId(payload.data.selected?.id ?? payload.data.current?.id ?? '')
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Failed to load Senior CRM automation settings')
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
      const response = await fetch('/api/admin/sr-crm-rotation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          automationEnabled,
          seniorCrmUserId: selectedSeniorCrmId || undefined,
        }),
      })
      const payload = (await response.json()) as SrCrmRotationResponse
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? 'Failed to save Senior CRM automation settings')
      }

      setWeekly(payload.data)
      setAutomationEnabled(payload.data.automationEnabled)
      setSelectedSeniorCrmId(payload.data.selected?.id ?? payload.data.current?.id ?? selectedSeniorCrmId)
      setStatusMessage(payload.message ?? 'Senior CRM automation settings updated')
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Failed to save Senior CRM automation settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-4 w-4" />
          Weekly Senior CRM Auto Suggestion
        </CardTitle>
        <CardDescription>
          Controls the Senior CRM that JR CRM sees pre-selected while scheduling visits. The week runs Saturday to Thursday.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Automatically suggest weekly Senior CRM</p>
            <p className="text-xs text-muted-foreground">
              Turn off to stop pre-selecting a Senior CRM in the visit schedule dropdown.
            </p>
          </div>
          <Switch checked={automationEnabled} onCheckedChange={setAutomationEnabled} disabled={loading || saving} />
        </label>

        <div className="grid gap-3 rounded-lg border border-border p-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Senior CRM for this week</p>
            <Select
              value={selectedSeniorCrmId}
              onValueChange={setSelectedSeniorCrmId}
              disabled={loading || saving || seniors.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={seniors.length ? 'Select Senior CRM' : 'No Senior CRM users'} />
              </SelectTrigger>
              <SelectContent>
                {seniors.map((senior) => (
                  <SelectItem key={senior.id} value={senior.id}>
                    {senior.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {automationEnabled
                ? `${selectedSenior?.fullName ?? 'Selected Senior CRM'} will be suggested for the rest of ${formatWeekRange(weekly?.weekStart)}.`
                : 'Automatic suggestion is disabled; JR CRM can still manually choose a Senior CRM while scheduling.'}
            </p>
          </div>

          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Current setting</p>
            <p>{weekly?.selected?.fullName ?? weekly?.current?.fullName ?? 'Not set'}</p>
            <p className="mt-2 font-semibold text-foreground">Next automatic rotation</p>
            <p>{automationEnabled ? weekly?.next?.fullName ?? 'Not available' : 'Disabled'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => void save()} disabled={loading || saving || (automationEnabled && !selectedSeniorCrmId)} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Senior CRM Setting'}
          </Button>
          <Button variant="outline" onClick={() => void loadSettings()} disabled={loading || saving} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {statusMessage ? (
          <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {statusMessage}
          </div>
        ) : null}
        {statusError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <p>{statusError}</p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
