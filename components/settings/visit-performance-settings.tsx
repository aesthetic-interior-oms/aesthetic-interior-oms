'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Frown,
  Loader2,
  RotateCcw,
  Save,
  Smile,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  BEHAVIOUR_TAG_OPTIONS,
  getBehaviourPointsForTag,
  VisitPerformanceRow,
} from '@/lib/visit-performance-types'
import { generateVisitTeamPerformancePdf } from '@/lib/visit-team-performance-pdf'

type MemberDraft = {
  absentDays: number
  behaviourTag: string
  notes: string
  isEnabled: boolean
}

function getTagBadgeColor(tag: string | null) {
  if (!tag) return 'bg-slate-500/10 text-slate-700 border-slate-500/20'
  switch (tag.toUpperCase()) {
    case 'BEST':
      return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300'
    case 'BETTER':
      return 'bg-teal-500/15 text-teal-700 border-teal-500/30 dark:text-teal-300'
    case 'GOOD':
      return 'bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300'
    case 'NEUTRAL':
      return 'bg-slate-500/15 text-slate-700 border-slate-500/30 dark:text-slate-300'
    case 'BAD':
      return 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300'
    case 'WORSE':
      return 'bg-orange-500/15 text-orange-700 border-orange-500/30 dark:text-orange-300'
    case 'WORST':
      return 'bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-300'
    default:
      return 'bg-slate-500/10 text-slate-700 border-slate-500/20'
  }
}

function formatMonthLabel(monthKey: string): string {
  if (!monthKey || !monthKey.includes('-')) return monthKey
  const [yearStr, monthStr] = monthKey.split('-')
  const date = new Date(Number(yearStr), Number(monthStr) - 1, 1)
  return isNaN(date.getTime())
    ? monthKey
    : date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function getCurrentMonthKey(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function shiftMonth(monthKey: string, delta: number): string {
  const [yearStr, monthStr] = monthKey.split('-')
  const date = new Date(Number(yearStr), Number(monthStr) - 1 + delta, 1)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function VisitPerformanceSettings() {
  const [monthKey, setMonthKey] = useState<string>(getCurrentMonthKey)
  const [members, setMembers] = useState<VisitPerformanceRow[]>([])
  const [drafts, setDrafts] = useState<Record<string, MemberDraft>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const loadData = useCallback(async (selectedMonth: string) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/visit-team/performance-settings?month=${selectedMonth}`, {
        cache: 'no-store',
      })
      const payload = await res.json()
      if (!res.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to load member assessments')
      }

      const rows: VisitPerformanceRow[] = payload.members ?? []
      setMembers(rows)

      const initialDrafts: Record<string, MemberDraft> = {}
      for (const m of rows) {
        initialDrafts[m.id] = {
          absentDays: m.absentDays ?? 0,
          behaviourTag: m.behaviourTag || 'NEUTRAL',
          notes: m.behaviourNote || '',
          isEnabled: m.isEnabled ?? true,
        }
      }
      setDrafts(initialDrafts)
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Error loading performance data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData(monthKey)
  }, [loadData, monthKey])

  const handleToggleEnabled = (userId: string, isEnabled: boolean) => {
    setDrafts((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] ?? { absentDays: 0, behaviourTag: 'NEUTRAL', notes: '', isEnabled: true }),
        isEnabled,
      },
    }))
  }

  const handleAbsentDaysChange = (userId: string, valStr: string) => {
    const num = Math.max(0, parseInt(valStr, 10) || 0)
    setDrafts((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] ?? { absentDays: 0, behaviourTag: 'NEUTRAL', notes: '', isEnabled: true }),
        absentDays: num,
      },
    }))
  }

  const handleBehaviourTagChange = (userId: string, tag: string) => {
    setDrafts((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] ?? { absentDays: 0, behaviourTag: 'NEUTRAL', notes: '', isEnabled: true }),
        behaviourTag: tag,
      },
    }))
  }

  const handleNotesChange = (userId: string, notes: string) => {
    setDrafts((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] ?? { absentDays: 0, behaviourTag: 'NEUTRAL', notes: '', isEnabled: true }),
        notes,
      },
    }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const payload = {
        monthKey,
        assessments: members.map((m) => {
          const draft = drafts[m.id] ?? { absentDays: 0, behaviourTag: 'NEUTRAL', notes: '', isEnabled: true }
          return {
            userId: m.id,
            absentDays: draft.absentDays,
            attendanceScore: Math.max(0, 10 - draft.absentDays * 2),
            behaviourTag: draft.behaviourTag,
            behaviourScore: getBehaviourPointsForTag(draft.behaviourTag),
            notes: draft.notes,
            isEnabled: draft.isEnabled,
          }
        }),
      }

      const res = await fetch('/api/visit-team/performance-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to save assessments')
      }

      toast.success('Performance marks updated successfully!')
      if (Array.isArray(result.members)) {
        setMembers(result.members)
      } else {
        void loadData(monthKey)
      }
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Failed to save assessments')
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true)
      // Only include enabled members in the generated PDF
      const activeToPrint = previewedMembers
        .filter((m) => m.draftIsEnabled)
        .map((m) => ({
          ...m,
          absentDays: m.draftAbsentDays,
          attendanceScore: m.draftAttendanceScore,
          behaviourTag: m.draftBehaviourTag,
          behaviourScore: m.draftBehaviourScore,
          performance: m.previewPerformance,
        }))

      await generateVisitTeamPerformancePdf({
        monthKey,
        members: activeToPrint,
      })
      toast.success('Performance PDF downloaded')
    } catch (err) {
      console.error(err)
      toast.error('Failed to generate PDF')
    } finally {
      setDownloadingPdf(false)
    }
  }

  // Real-time score preview for each member based on drafts
  const previewedMembers = useMemo(() => {
    return members.map((m) => {
      const draft = drafts[m.id]
      const isEnabled = draft?.isEnabled !== undefined ? draft.isEnabled : (m.isEnabled ?? true)
      const absentDays = draft ? draft.absentDays : (m.absentDays ?? 0)
      const attendanceScore = Math.max(0, 10 - absentDays * 2)
      const behaviourTag = draft ? draft.behaviourTag : (m.behaviourTag ?? 'NEUTRAL')
      const behaviourScore = getBehaviourPointsForTag(behaviourTag)
      const operationalScore = m.operationalScore ?? 0

      const previewPerformance = Math.max(
        0,
        Math.min(100, Math.round(operationalScore + attendanceScore + behaviourScore)),
      )

      return {
        ...m,
        draftIsEnabled: isEnabled,
        draftAbsentDays: absentDays,
        draftAttendanceScore: attendanceScore,
        draftBehaviourTag: behaviourTag,
        draftBehaviourScore: behaviourScore,
        draftNotes: draft?.notes ?? '',
        previewPerformance,
      }
    })
  }, [members, drafts])

  const activeMembers = useMemo(() => previewedMembers.filter((m) => m.draftIsEnabled), [previewedMembers])
  const topPerformer = activeMembers[0] ?? null
  const avgScore = activeMembers.length
    ? Math.round(activeMembers.reduce((sum, m) => sum + m.previewPerformance, 0) / activeMembers.length)
    : 0

  return (
    <div className="space-y-6">
      {/* Header & Month Control */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Users className="size-5 text-teal-600" />
                Monthly Visit Member Assessments
              </CardTitle>
              <CardDescription className="mt-1 text-sm text-muted-foreground">
                Give attendance and behaviour marks to visit team members. Scores dynamically calculate
                into the dashboard and performance PDF for the selected month.
              </CardDescription>
            </div>

            {/* Month Switcher */}
            <div className="flex items-center gap-2 self-start sm:self-auto bg-muted/60 p-1 rounded-xl border border-border">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setMonthKey((prev) => shiftMonth(prev, -1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <div className="flex items-center gap-2 px-2 text-sm font-semibold">
                <Calendar className="size-4 text-teal-600" />
                <span>{formatMonthLabel(monthKey)}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setMonthKey((prev) => shiftMonth(prev, 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Rules / Explanation Alert */}
          <div className="grid gap-3 rounded-xl border border-teal-500/20 bg-teal-500/5 p-4 text-xs text-foreground md:grid-cols-2">
            <div className="flex items-start gap-2.5">
              <Smile className="size-4 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-teal-800 dark:text-teal-300">Positive Behaviour (+ Marks):</span>
                <p className="text-muted-foreground mt-0.5">
                  <strong>Best (+10)</strong>, <strong>Better (+5)</strong>, <strong>Good (+2)</strong> positively boost member performance.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Frown className="size-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-rose-800 dark:text-rose-300">Negative Behaviour (- Marks) & Attendance:</span>
                <p className="text-muted-foreground mt-0.5">
                  <strong>Bad (-5)</strong>, <strong>Worse (-10)</strong>, <strong>Worst (-15)</strong> penalize.
                  Attendance starts at 10 marks and deducts <strong>2 marks per absent day</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border bg-card p-3">
              <div className="text-xs text-muted-foreground font-medium">Department Members</div>
              <div className="text-lg font-bold text-foreground mt-1">{previewedMembers.length}</div>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <div className="text-xs text-muted-foreground font-medium">Month Avg Score</div>
              <div className="text-lg font-bold text-teal-600 mt-1">{avgScore} / 100</div>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <div className="text-xs text-muted-foreground font-medium">Top Performer</div>
              <div className="text-sm font-semibold text-foreground truncate mt-1">
                {topPerformer ? `${topPerformer.name} (${topPerformer.previewPerformance})` : '—'}
              </div>
            </div>
            <div className="rounded-lg border bg-card p-3 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground font-medium">Report PDF</div>
                <div className="text-xs text-muted-foreground mt-0.5">{monthKey}</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf || loading || previewedMembers.length === 0}
                className="gap-1.5 h-8 text-xs font-semibold"
              >
                {downloadingPdf ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Download className="size-3.5 text-teal-600" />
                )}
                PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members Evaluation Table */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold">Department Member Scores</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Review field stats, set absent days and assign behaviour tags for {formatMonthLabel(monthKey)}.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadData(monthKey)}
              disabled={loading || saving}
              className="gap-1.5 h-8 text-xs"
            >
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={loading || saving || previewedMembers.length === 0}
              className="gap-1.5 h-8 bg-teal-600 text-white hover:bg-teal-700 text-xs font-semibold"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Save Assessments
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0 sm:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-teal-600" />
              <p className="text-sm">Loading member performance data...</p>
            </div>
          ) : previewedMembers.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No visit department members found for this month.
            </div>
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {previewedMembers.map((member, idx) => {
                const isEnabled = member.draftIsEnabled
                return (
                  <div
                    key={member.id}
                    className={`p-4 transition-colors flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between ${
                      isEnabled ? 'hover:bg-muted/30' : 'bg-muted/15 opacity-70 border-l-4 border-l-slate-400'
                    }`}
                  >
                    {/* Member identity & field metrics */}
                    <div className="min-w-0 lg:w-[260px]">
                      <div className="flex items-center gap-2">
                        <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                          {idx + 1}
                        </span>
                        <h4 className={`font-semibold truncate text-sm ${isEnabled ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                          {member.name}
                        </h4>
                        {!isEnabled && (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground border-dashed">
                            Hidden from PDF
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[11px] font-normal">
                          {member.completed}/{member.totalVisits} visits
                        </Badge>
                        <Badge variant="outline" className="text-[11px] font-normal">
                          {member.totalSqft.toLocaleString()} SFT
                        </Badge>
                        <Badge variant="outline" className="text-[11px] font-normal">
                          {member.reportCompleteness}% reports
                        </Badge>
                      </div>
                    </div>

                    {/* Enable / Disable Toggle */}
                    <div className="flex flex-col gap-1.5 sm:w-[130px]">
                      <Label className="text-xs font-medium text-muted-foreground">
                        Performance Status:
                      </Label>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) => handleToggleEnabled(member.id, checked)}
                        />
                        <span className={`text-xs font-semibold ${isEnabled ? 'text-teal-700 dark:text-teal-300' : 'text-muted-foreground'}`}>
                          {isEnabled ? 'Included' : 'Disabled'}
                        </span>
                      </div>
                    </div>

                    {/* Attendance Controls */}
                    <div className="flex flex-col gap-1.5 sm:w-[140px]">
                      <Label className="text-xs font-medium text-muted-foreground">
                        Absent Days:
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={31}
                          disabled={!isEnabled}
                          value={member.draftAbsentDays}
                          onChange={(e) => handleAbsentDaysChange(member.id, e.target.value)}
                          className="h-8 w-16 text-center text-xs font-semibold"
                        />
                        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                          {member.draftAttendanceScore}/10
                        </span>
                      </div>
                    </div>

                    {/* Behaviour Tag Select */}
                    <div className="flex flex-col gap-1.5 sm:w-[190px]">
                      <Label className="text-xs font-medium text-muted-foreground">
                        Behaviour Rating:
                      </Label>
                      <div className="flex items-center gap-2">
                        <select
                          disabled={!isEnabled}
                          value={member.draftBehaviourTag}
                          onChange={(e) => handleBehaviourTagChange(member.id, e.target.value)}
                          className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-50"
                        >
                          {BEHAVIOUR_TAG_OPTIONS.map((opt) => (
                            <option key={opt.tag} value={opt.tag}>
                              {opt.label} ({opt.defaultPoints >= 0 ? `+${opt.defaultPoints}` : opt.defaultPoints} pts)
                            </option>
                          ))}
                        </select>
                        <Badge
                          variant="outline"
                          className={`text-[10px] shrink-0 ${getTagBadgeColor(member.draftBehaviourTag)}`}
                        >
                          {member.draftBehaviourScore >= 0 ? `+${member.draftBehaviourScore}` : member.draftBehaviourScore}
                        </Badge>
                      </div>
                    </div>

                    {/* Notes / Feedback */}
                    <div className="flex flex-col gap-1.5 lg:w-[200px]">
                      <Label className="text-xs font-medium text-muted-foreground">
                        Observations / Note:
                      </Label>
                      <Input
                        type="text"
                        disabled={!isEnabled}
                        placeholder="Optional feedback..."
                        value={member.draftNotes}
                        onChange={(e) => handleNotesChange(member.id, e.target.value)}
                        className="h-8 text-xs disabled:opacity-50"
                      />
                    </div>

                    {/* Live Final Performance Score */}
                    <div className="flex items-center justify-between lg:flex-col lg:items-end lg:justify-center border-t border-border pt-3 lg:border-t-0 lg:pt-0">
                      <span className="text-xs text-muted-foreground">Final Score:</span>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-xl font-extrabold ${isEnabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {isEnabled ? member.previewPerformance : '—'}
                        </span>
                        {isEnabled && <span className="text-xs font-medium text-muted-foreground">/100</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
