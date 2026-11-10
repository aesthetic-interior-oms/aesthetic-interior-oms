'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Save,
  Search,
  SlidersHorizontal,
  UserCheck,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { VisitPerformanceSettings } from '@/components/settings/visit-performance-settings'
import { generateSrCrmPerformancePdf } from '@/lib/sr-crm-performance-pdf'
import { generateJrArchitectPerformancePdf } from '@/lib/jr-architect-performance-pdf'
import { generateQuotationTeamPerformancePdf } from '@/lib/quotation-team-performance-pdf'
import { generateVisitTeamPerformancePdf } from '@/lib/visit-team-performance-pdf'

type DepartmentType = 'SR_CRM' | 'VISIT_TEAM' | 'JR_ARCHITECT' | 'QUOTATION'

type MemberItem = {
  userId: string
  fullName: string
  email: string | null
  departmentName: string
  isEnabled: boolean
  notes?: string | null
  roleNames?: string[]
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

function formatMonthLabel(monthKey: string): string {
  if (!monthKey || !monthKey.includes('-')) return monthKey
  const [yearStr, monthStr] = monthKey.split('-')
  const date = new Date(Number(yearStr), Number(monthStr) - 1, 1)
  return isNaN(date.getTime())
    ? monthKey
    : date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function DepartmentPerformanceSettings() {
  const [activeDept, setActiveDept] = useState<DepartmentType>('SR_CRM')
  const [monthKey, setMonthKey] = useState<string>(getCurrentMonthKey)
  const [members, setMembers] = useState<MemberItem[]>([])
  const [drafts, setDrafts] = useState<Record<string, { isEnabled: boolean; notes: string }>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const loadData = useCallback(async (dept: DepartmentType, selectedMonth: string) => {
    if (dept === 'VISIT_TEAM') {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const res = await fetch(
        `/api/admin/department-performance-settings?department=${dept}&month=${selectedMonth}`,
        { cache: 'no-store' },
      )
      const payload = await res.json()
      if (!res.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to load department member settings')
      }

      const rows: MemberItem[] = payload.members ?? []
      setMembers(rows)

      const initialDrafts: Record<string, { isEnabled: boolean; notes: string }> = {}
      for (const m of rows) {
        initialDrafts[m.userId] = {
          isEnabled: m.isEnabled,
          notes: m.notes || '',
        }
      }
      setDrafts(initialDrafts)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load department members')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData(activeDept, monthKey)
  }, [activeDept, monthKey, loadData])

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members
    const q = searchQuery.toLowerCase()
    return members.filter(
      (m) =>
        m.fullName.toLowerCase().includes(q) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.roleNames && m.roleNames.some((r) => r.toLowerCase().includes(q))),
    )
  }, [members, searchQuery])

  const enabledCount = useMemo(() => {
    return Object.values(drafts).filter((d) => d.isEnabled).length
  }, [drafts])

  const totalCount = members.length

  const handleToggle = (userId: string, isEnabled: boolean) => {
    setDrafts((prev) => ({
      ...prev,
      [userId]: {
        isEnabled,
        notes: prev[userId]?.notes || '',
      },
    }))
  }

  const handleNotesChange = (userId: string, notes: string) => {
    setDrafts((prev) => ({
      ...prev,
      [userId]: {
        isEnabled: prev[userId]?.isEnabled ?? true,
        notes,
      },
    }))
  }

  const handleToggleAll = (enabled: boolean) => {
    setDrafts((prev) => {
      const next = { ...prev }
      for (const m of members) {
        next[m.userId] = {
          isEnabled: enabled,
          notes: prev[m.userId]?.notes || '',
        }
      }
      return next
    })
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const settingsPayload = Object.entries(drafts).map(([userId, d]) => ({
        userId,
        isEnabled: d.isEnabled,
        notes: d.notes,
      }))

      const res = await fetch('/api/admin/department-performance-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: activeDept,
          monthKey,
          settings: settingsPayload,
        }),
      })

      const payload = await res.json()
      if (!res.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to save settings')
      }

      toast.success(`${deptLabel(activeDept)} performance visibility updated for ${formatMonthLabel(monthKey)}`)
      await loadData(activeDept, monthKey)
    } catch (err) {
      console.error(err)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true)
      const res = await fetch(
        `/api/admin/department-performance-data?department=${activeDept}&month=${monthKey}`,
        { cache: 'no-store' },
      )
      const payload = await res.json()
      if (!res.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to load department performance data for PDF')
      }

      const data = payload.data || {}

      if (activeDept === 'SR_CRM') {
        const rows = data.srCrmMembers || []
        await generateSrCrmPerformancePdf({
          monthKey,
          members: rows,
          generatedBy: 'Admin',
        })
        toast.success('Senior CRM Performance PDF downloaded')
      } else if (activeDept === 'JR_ARCHITECT') {
        const rows = data.jrArchitectMembers || []
        await generateJrArchitectPerformancePdf({
          monthKey,
          members: rows,
          generatedBy: 'Admin',
        })
        toast.success('JR Architect Performance PDF downloaded')
      } else if (activeDept === 'QUOTATION') {
        const rows = data.quotationMembers || []
        await generateQuotationTeamPerformancePdf({
          monthKey,
          members: rows,
          generatedBy: 'Admin',
        })
        toast.success('Quotation Department Performance PDF downloaded')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to download performance PDF')
    } finally {
      setDownloadingPdf(false)
    }
  }

  function deptLabel(dept: DepartmentType): string {
    switch (dept) {
      case 'SR_CRM':
        return 'Senior CRM'
      case 'VISIT_TEAM':
        return 'Visit Team'
      case 'JR_ARCHITECT':
        return 'JR Architect'
      case 'QUOTATION':
        return 'Quotation Team'
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Department Switcher */}
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <SlidersHorizontal className="size-5 text-teal-600" />
                Department Performance & Visibility Control
              </CardTitle>
              <CardDescription className="mt-1">
                Configure who appears on the Admin Dashboard leaderboard and is included in monthly department performance reports.
              </CardDescription>
            </div>
            {/* Global Month Selector */}
            <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border/80">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setMonthKey((prev) => shiftMonth(prev, -1))}
                aria-label="Previous Month"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <div className="flex items-center gap-2 px-2">
                <Calendar className="size-4 text-teal-600" />
                <Input
                  type="month"
                  value={monthKey}
                  onChange={(e) => e.target.value && setMonthKey(e.target.value)}
                  className="h-8 w-36 text-xs font-semibold bg-background"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setMonthKey((prev) => shiftMonth(prev, 1))}
                aria-label="Next Month"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeDept}
            onValueChange={(val) => setActiveDept(val as DepartmentType)}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto p-1 bg-muted/80">
              <TabsTrigger value="SR_CRM" className="gap-2 py-2">
                <Users className="size-4" />
                <span>Senior CRM</span>
              </TabsTrigger>
              <TabsTrigger value="VISIT_TEAM" className="gap-2 py-2">
                <UserCheck className="size-4" />
                <span>Visit Team</span>
              </TabsTrigger>
              <TabsTrigger value="JR_ARCHITECT" className="gap-2 py-2">
                <SlidersHorizontal className="size-4" />
                <span>JR Architect</span>
              </TabsTrigger>
              <TabsTrigger value="QUOTATION" className="gap-2 py-2">
                <Users className="size-4" />
                <span>Quotation Team</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* If Visit Team is selected, render the dedicated VisitPerformanceSettings component which also has attendance & behaviour */}
      {activeDept === 'VISIT_TEAM' ? (
        <VisitPerformanceSettings />
      ) : (
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">
                    {deptLabel(activeDept)} Member Roster — {formatMonthLabel(monthKey)}
                  </h3>
                  <Badge variant="outline" className="border-teal-500/30 text-teal-700 dark:text-teal-400">
                    {enabledCount} of {totalCount} Visible on Dashboard
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Toggle members on or off to include or exclude them from dashboard leaderboards, performance metrics, and PDF exports.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf || members.length === 0}
                  className="gap-1.5 h-9 text-xs font-semibold"
                >
                  {downloadingPdf ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Download className="size-3.5 text-teal-600" />
                  )}
                  Download {deptLabel(activeDept)} PDF
                </Button>

                <Button
                  onClick={handleSave}
                  disabled={saving || loading}
                  className="bg-[#1f363d] hover:bg-[#15252a] text-white shadow-sm gap-1.5 h-9 text-xs font-semibold"
                  size="sm"
                >
                  {saving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  Save Changes
                </Button>
              </div>
            </div>

            {/* Filter and quick actions */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={`Search ${deptLabel(activeDept)} members...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs bg-background"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleAll(true)}
                  className="text-xs h-8"
                >
                  Enable All
                </Button>
                <span className="text-muted-foreground/40">|</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleAll(false)}
                  className="text-xs h-8 text-destructive hover:text-destructive"
                >
                  Disable All
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="size-6 animate-spin text-teal-600" />
                <span className="text-xs">Loading {deptLabel(activeDept)} roster...</span>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No team members found for this department or query.
              </div>
            ) : (
              <div className="divide-y divide-border/60 rounded-xl border border-border/70 overflow-hidden bg-card">
                {filteredMembers.map((member) => {
                  const draft = drafts[member.userId] ?? {
                    isEnabled: member.isEnabled,
                    notes: member.notes || '',
                  }
                  return (
                    <div
                      key={member.userId}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 transition-colors ${
                        draft.isEnabled ? 'bg-card hover:bg-muted/30' : 'bg-muted/20 opacity-75'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs uppercase">
                          {member.fullName.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm text-foreground truncate">
                              {member.fullName}
                            </span>
                            {member.roleNames?.map((role) => (
                              <Badge key={role} variant="secondary" className="text-[10px] px-1.5 py-0">
                                {role}
                              </Badge>
                            ))}
                            {!draft.isEnabled && (
                              <Badge variant="outline" className="border-destructive/30 text-destructive text-[10px] px-1.5 py-0">
                                Hidden from Dashboard
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {member.email || 'No email registered'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 sm:justify-end shrink-0">
                        <Input
                          type="text"
                          placeholder="Admin notes (optional)"
                          value={draft.notes}
                          onChange={(e) => handleNotesChange(member.userId, e.target.value)}
                          className="h-8 w-48 text-xs bg-background"
                        />

                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor={`switch-${member.userId}`}
                            className="text-xs cursor-pointer font-medium"
                          >
                            {draft.isEnabled ? (
                              <span className="text-teal-700 dark:text-teal-400 font-semibold">Active</span>
                            ) : (
                              <span className="text-muted-foreground">Excluded</span>
                            )}
                          </Label>
                          <Switch
                            id={`switch-${member.userId}`}
                            checked={draft.isEnabled}
                            onCheckedChange={(checked) => handleToggle(member.userId, checked)}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
