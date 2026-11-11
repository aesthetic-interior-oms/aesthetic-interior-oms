'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Unlock,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

export type QuotationWorkType = 'DETAIL' | 'SHORT' | 'FURNITURE' | 'ELECTRICAL'

export interface DayInfo {
  dayName: string
  shortDayName: string
  dateKey: string
  dateLabel: string
  isToday: boolean
  isFuture: boolean
  entriesCount: number
  totalSqft: number
}

export interface WeekCycleInfo {
  weekKey: string
  saturdayDate: string
  fridayDate: string
  lockDeadline: string
  isLocked: boolean
  days: DayInfo[]
  weekTotalSqft: number
  weekTotalEntries: number
}

export interface DetectedLeadWork {
  leadId: string
  leadName: string
  clientId: string | null
  workType: QuotationWorkType
  defaultSqft: number
  detectedReason: string
}

export interface ReportItem {
  id?: string
  leadId: string
  leadName: string
  clientId?: string | null
  phone?: string | null
  workType: QuotationWorkType
  sqft: number
  notes?: string | null
  isAutoDetected?: boolean
}

interface LeadSearchResult {
  id: string
  name: string
  clientId: string | null
  phone: string | null
  stage?: string
  subStatus?: string | null
  defaultSqft?: number
}

interface DailyWorkReportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
  userId?: string
}

const WORK_TYPE_CONFIG: Record<
  QuotationWorkType,
  { label: string; badgeClass: string }
> = {
  DETAIL: {
    label: 'Detail Quotation',
    badgeClass: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900',
  },
  SHORT: {
    label: 'Short Quotation',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900',
  },
  FURNITURE: {
    label: 'Furniture Quotation',
    badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-900',
  },
  ELECTRICAL: {
    label: 'Electrical Quotation',
    badgeClass: 'bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-900',
  },
}

export function DailyWorkReportModal({
  open,
  onOpenChange,
  onSaved,
  userId,
}: DailyWorkReportModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [weekInfo, setWeekInfo] = useState<WeekCycleInfo | null>(null)
  const [selectedDateKey, setSelectedDateKey] = useState<string>('')
  const [isDateLocked, setIsDateLocked] = useState(false)
  const [currentEntries, setCurrentEntries] = useState<ReportItem[]>([])
  const [suggestedLeads, setSuggestedLeads] = useState<DetectedLeadWork[]>([])

  // Search & manual addition state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<LeadSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedManualLead, setSelectedManualLead] = useState<LeadSearchResult | null>(null)
  const [manualWorkType, setManualWorkType] = useState<QuotationWorkType>('DETAIL')
  const [manualSqft, setManualSqft] = useState<string>('')

  // Fetch report data for selected date
  const fetchDayData = async (dateKey?: string) => {
    setLoading(true)
    try {
      const url = new URL('/api/quotation/daily-work', window.location.origin)
      if (dateKey) url.searchParams.set('dateKey', dateKey)
      if (userId) url.searchParams.set('userId', userId)

      const res = await fetch(url.toString(), { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load daily work data')
      }

      setWeekInfo(data.weekInfo)
      setSelectedDateKey(data.selectedDateKey)
      setIsDateLocked(data.isDateLocked)
      setCurrentEntries(data.currentEntries || [])
      setSuggestedLeads(data.suggestedLeads || [])
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Error loading daily work report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      void fetchDayData(selectedDateKey || undefined)
    }
  }, [open, selectedDateKey])

  // Search leads for manual addition
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `/api/quotation/daily-work/leads-search?q=${encodeURIComponent(searchQuery)}`,
        )
        const data = await res.json()
        if (data.success) {
          setSearchResults(data.leads || [])
        }
      } catch (err) {
        console.error(err)
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Add a suggested lead to report
  const handleAddSuggested = (suggested: DetectedLeadWork) => {
    const exists = currentEntries.some(
      (e) => e.leadId === suggested.leadId && e.workType === suggested.workType,
    )
    if (exists) {
      toast.info('This lead and work type is already in today’s report')
      return
    }

    const newItem: ReportItem = {
      leadId: suggested.leadId,
      leadName: suggested.leadName,
      clientId: suggested.clientId,
      workType: suggested.workType,
      sqft: suggested.defaultSqft || 0,
      isAutoDetected: true,
    }

    setCurrentEntries((prev) => [...prev, newItem])
    setSuggestedLeads((prev) =>
      prev.filter(
        (s) => !(s.leadId === suggested.leadId && s.workType === suggested.workType),
      ),
    )
    toast.success(`Added ${suggested.leadName} to report`)
  }

  // Add all detected leads with one click
  const handleAddAllDetected = () => {
    if (suggestedLeads.length === 0) return
    const newItems: ReportItem[] = suggestedLeads.map((s) => ({
      leadId: s.leadId,
      leadName: s.leadName,
      clientId: s.clientId,
      workType: s.workType,
      sqft: s.defaultSqft || 0,
      isAutoDetected: true,
    }))

    setCurrentEntries((prev) => [...prev, ...newItems])
    setSuggestedLeads([])
    toast.success(`Added all ${newItems.length} suggested leads to today's report`)
  }

  // Add manually searched lead
  const handleAddManualLead = () => {
    if (!selectedManualLead) {
      toast.error('Please select a lead first')
      return
    }

    const exists = currentEntries.some(
      (e) => e.leadId === selectedManualLead.id && e.workType === manualWorkType,
    )
    if (exists) {
      toast.info('This lead and work type is already in today’s report')
      return
    }

    const parsedSqft = Number(manualSqft) || selectedManualLead.defaultSqft || 0

    const newItem: ReportItem = {
      leadId: selectedManualLead.id,
      leadName: selectedManualLead.name,
      clientId: selectedManualLead.clientId,
      phone: selectedManualLead.phone,
      workType: manualWorkType,
      sqft: parsedSqft,
      isAutoDetected: false,
    }

    setCurrentEntries((prev) => [...prev, newItem])
    setSelectedManualLead(null)
    setSearchQuery('')
    setManualSqft('')
    toast.success(`Added ${selectedManualLead.name} to report`)
  }

  // Update sqft for a row (the single editable user field!)
  const handleUpdateSqft = (index: number, val: string) => {
    const num = Math.max(0, Number(val) || 0)
    setCurrentEntries((prev) => {
      const copy = [...prev]
      if (copy[index]) {
        copy[index] = { ...copy[index], sqft: num }
      }
      return copy
    })
  }

  // Remove a lead entry
  const handleRemoveEntry = (index: number) => {
    setCurrentEntries((prev) => prev.filter((_, i) => i !== index))
  }

  // Save the report for the selected day
  const handleSaveReport = async () => {
    if (isDateLocked) {
      toast.error('Cannot edit: This week was locked on Friday at 12:00 PM.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/quotation/daily-work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateKey: selectedDateKey,
          userId,
          entries: currentEntries.map((e) => ({
            leadId: e.leadId,
            workType: e.workType,
            sqft: e.sqft,
            notes: e.notes || null,
            isAutoDetected: e.isAutoDetected,
          })),
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save daily work report')
      }

      toast.success('Daily work report saved successfully! Performance updated.')
      if (onSaved) onSaved()
      void fetchDayData(selectedDateKey)
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Failed to save daily work report')
    } finally {
      setSaving(false)
    }
  }

  // Calculate day totals
  const totalDaySqft = currentEntries.reduce((sum, item) => sum + (Number(item.sqft) || 0), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden sm:rounded-xl">
        {/* Modal Header */}
        <DialogHeader className="p-5 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                <Calendar className="h-5 w-5 text-primary" />
                Quotation Team Daily Work Report
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Record your daily project square feet (sqft) for quotation performance tracking.
              </DialogDescription>
            </div>

            {/* Lock Status Pill */}
            <div>
              {weekInfo?.isLocked || isDateLocked ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 border border-red-200 dark:border-red-900">
                  <Lock className="h-3.5 w-3.5" />
                  <span>Week Closed (Locked on Friday 12:00 PM)</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-200 dark:border-emerald-900">
                  <Unlock className="h-3.5 w-3.5" />
                  <span>Active Week (Locks Friday 12:00 PM)</span>
                </div>
              )}
            </div>
          </div>

          {/* 7-Day Navigation Tabs (Saturday to Thursday / Friday) */}
          <div className="mt-4 grid grid-cols-7 gap-1.5 pt-2">
            {(weekInfo?.days || []).map((day) => {
              const isSelected = day.dateKey === selectedDateKey
              return (
                <button
                  key={day.dateKey}
                  type="button"
                  onClick={() => setSelectedDateKey(day.dateKey)}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all text-center relative ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm font-semibold'
                      : 'bg-card hover:bg-accent/50 border-border text-foreground'
                  }`}
                >
                  {day.isToday && (
                    <span
                      className={`absolute -top-1.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        isSelected
                          ? 'bg-primary-foreground text-primary'
                          : 'bg-primary text-primary-foreground'
                      }`}
                    >
                      Today
                    </span>
                  )}
                  <span className="text-xs font-medium">{day.shortDayName}</span>
                  <span className="text-[11px] opacity-80">{day.dateLabel}</span>
                  <div className="mt-1">
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : day.totalSqft > 0
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {day.totalSqft > 0 ? `${day.totalSqft.toLocaleString()} sqft` : '—'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </DialogHeader>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-40 w-full rounded-lg" />
            </div>
          ) : (
            <>
              {/* Section 1: Auto-Detected Leads Banner */}
              {suggestedLeads.length > 0 && !isDateLocked && (
                <div className="rounded-xl border border-amber-200/80 bg-amber-500/5 p-4 space-y-3 dark:border-amber-900/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-600 animate-pulse" />
                      <span className="text-sm font-semibold text-foreground">
                        Detected Activity on this Day ({suggestedLeads.length})
                      </span>
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        — The system found leads you worked on today. Click to add them:
                      </span>
                    </div>
                    {suggestedLeads.length > 1 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs bg-card hover:bg-amber-500/10 border-amber-300 text-amber-700 dark:text-amber-400"
                        onClick={handleAddAllDetected}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add All Detected
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {suggestedLeads.map((s) => {
                      const config = WORK_TYPE_CONFIG[s.workType]
                      return (
                        <button
                          key={`${s.leadId}-${s.workType}`}
                          type="button"
                          onClick={() => handleAddSuggested(s)}
                          className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card hover:bg-amber-500/10 border-amber-200 text-foreground transition-colors shadow-sm dark:border-amber-900"
                        >
                          <Plus className="h-3.5 w-3.5 text-amber-600 group-hover:scale-125 transition-transform" />
                          <span className="text-xs font-semibold">{s.leadName}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${config.badgeClass}`}
                          >
                            {config.label}
                          </span>
                          {s.defaultSqft > 0 && (
                            <span className="text-[11px] text-muted-foreground font-medium">
                              ({s.defaultSqft.toLocaleString()} sqft)
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Section 2: Manual Search & Add Bar (if not locked) */}
              {!isDateLocked && (
                <div className="rounded-xl border bg-muted/10 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Manually Add Lead (If not auto-detected)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    {/* Lead Search Input */}
                    <div className="sm:col-span-6 relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search lead by name, phone, or client ID..."
                          value={selectedManualLead ? selectedManualLead.name : searchQuery}
                          onChange={(e) => {
                            setSelectedManualLead(null)
                            setSearchQuery(e.target.value)
                          }}
                          className="pl-9 text-xs h-9 bg-card"
                        />
                      </div>

                      {/* Dropdown Results */}
                      {searchResults.length > 0 && !selectedManualLead && (
                        <div className="absolute left-0 right-0 top-10 z-50 rounded-lg border bg-popover shadow-lg max-h-48 overflow-y-auto divide-y divide-border">
                          {searchResults.map((lead) => (
                            <div
                              key={lead.id}
                              onClick={() => {
                                setSelectedManualLead(lead)
                                setSearchResults([])
                                if (lead.defaultSqft) {
                                  setManualSqft(String(lead.defaultSqft))
                                }
                              }}
                              className="p-2.5 hover:bg-accent cursor-pointer flex items-center justify-between text-xs"
                            >
                              <div>
                                <p className="font-semibold text-foreground">{lead.name}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {lead.phone || lead.clientId || 'Lead ID: ' + lead.id.slice(-6)}
                                </p>
                              </div>
                              {lead.defaultSqft ? (
                                <Badge variant="outline" className="text-[10px]">
                                  {lead.defaultSqft.toLocaleString()} sqft
                                </Badge>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quotation Type Picker */}
                    <div className="sm:col-span-3">
                      <Select
                        value={manualWorkType}
                        onValueChange={(val) => setManualWorkType(val as QuotationWorkType)}
                      >
                        <SelectTrigger className="text-xs h-9 bg-card">
                          <SelectValue placeholder="Work Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DETAIL">Detail Quotation</SelectItem>
                          <SelectItem value="SHORT">Short Quotation</SelectItem>
                          <SelectItem value="FURNITURE">Furniture Quotation</SelectItem>
                          <SelectItem value="ELECTRICAL">Electrical Quotation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Sqft Input */}
                    <div className="sm:col-span-2">
                      <Input
                        type="number"
                        placeholder="Sqft"
                        value={manualSqft}
                        onChange={(e) => setManualSqft(e.target.value)}
                        className="text-xs h-9 bg-card"
                      />
                    </div>

                    {/* Add Button */}
                    <div className="sm:col-span-1">
                      <Button
                        type="button"
                        size="sm"
                        disabled={!selectedManualLead}
                        onClick={handleAddManualLead}
                        className="w-full h-9 text-xs"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 3: Work Report Table for the Selected Day */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Reported Leads for {selectedDateKey}
                    <Badge variant="secondary" className="text-xs">
                      {currentEntries.length} {currentEntries.length === 1 ? 'Lead' : 'Leads'}
                    </Badge>
                  </h3>
                  <div className="text-xs font-bold text-foreground">
                    Day Total:{' '}
                    <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
                      {totalDaySqft.toLocaleString()} sqft
                    </span>
                  </div>
                </div>

                {currentEntries.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-8 text-center space-y-2 bg-muted/5">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
                    <p className="text-sm font-medium text-foreground">No leads reported for this day</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      {!isDateLocked
                        ? 'Click one of the suggested leads above or use the search bar to add leads you worked on today.'
                        : 'No entries were submitted for this day before the Friday 12:00 PM lock.'}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 border-b text-muted-foreground uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Lead Name</th>
                          <th className="py-2.5 px-3">Quotation Type</th>
                          <th className="py-2.5 px-3 w-44">
                            Square Feet (sqft) <span className="text-red-500">*</span>
                          </th>
                          {!isDateLocked && <th className="py-2.5 px-3 w-12 text-center">Action</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {currentEntries.map((entry, idx) => {
                          const config = WORK_TYPE_CONFIG[entry.workType]
                          return (
                            <tr key={`${entry.leadId}-${entry.workType}-${idx}`} className="hover:bg-muted/20">
                              <td className="py-3 px-3">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-foreground">{entry.leadName}</span>
                                    <Link
                                      href={`/quotation-team/leads/${entry.leadId}`}
                                      target="_blank"
                                      className="text-muted-foreground hover:text-primary transition-colors"
                                      title="Open Workspace"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </Link>
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                    {entry.clientId && <span>Client ID: {entry.clientId}</span>}
                                    {entry.isAutoDetected && (
                                      <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-medium">
                                        <Sparkles className="h-2.5 w-2.5" /> Auto-detected
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-3">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${config.badgeClass}`}
                                >
                                  {config.label}
                                </span>
                              </td>

                              {/* Only Editable Field: Square Feet */}
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-1.5">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="1"
                                    disabled={isDateLocked}
                                    value={entry.sqft === 0 ? '' : entry.sqft}
                                    placeholder="Enter sqft"
                                    onChange={(e) => handleUpdateSqft(idx, e.target.value)}
                                    className="h-8 text-xs font-semibold bg-card disabled:opacity-75 disabled:cursor-not-allowed"
                                  />
                                  <span className="text-[11px] text-muted-foreground font-medium">
                                    sqft
                                  </span>
                                </div>
                              </td>

                              {/* Remove Action */}
                              {!isDateLocked && (
                                <td className="py-3 px-3 text-center">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleRemoveEntry(idx)}
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-500/10"
                                    title="Remove from report"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </td>
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="p-4 border-t bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div>
              <span>Week Total: </span>
              <span className="font-bold text-foreground">
                {(weekInfo?.weekTotalSqft || 0).toLocaleString()} sqft
              </span>
            </div>
            {isDateLocked && (
              <span className="text-red-500 font-medium flex items-center gap-1">
                <Lock className="h-3 w-3" /> Locked on Friday 12:00 PM
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>

            {!isDateLocked && (
              <Button
                type="button"
                size="sm"
                disabled={saving || loading}
                onClick={handleSaveReport}
                className="gap-1.5"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Save Daily Report
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
