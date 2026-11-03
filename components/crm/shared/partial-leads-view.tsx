'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Calendar,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Loader2,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  User,
  Users,
  AlertCircle,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CrmPageHeader } from '@/components/crm/shared/page-header'
import LeadCreateModal from '@/components/crm/junior/LeadCreateModal'

type SdcUser = {
  id: string
  fullName: string
  email: string
}

type PartialLeadItem = {
  id: string
  clientNumber: string
  name: string
  phone: string
  location: string
  budget: number | null
  stage: string
  subStatus: string | null
  createdAt: string
  visit: {
    id: string
    scheduledAt: string
    status: string
    location: string
    notes: string | null
    visitFee: number
    assignedTo: { id: string; fullName: string; email: string } | null
  } | null
  lastFollowUp: {
    id: string
    followupDate: string
    status: string
    notes: string | null
    assignedTo: string
  } | null
  sdcAssignee: { id: string; fullName: string; email: string } | null
  jrCrmAssignee: { id: string; fullName: string; email: string } | null
}

type PartialLeadsViewProps = {
  leadBasePath?: string
  role?: string
}

export function PartialLeadsView({
  leadBasePath = '/crm/jr/leads',
  role = 'JR CRM',
}: PartialLeadsViewProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'schedule'>('list')
  const [leads, setLeads] = useState<PartialLeadItem[]>([])
  const [sdcUsers, setSdcUsers] = useState<SdcUser[]>([])
  const [stats, setStats] = useState({
    totalCount: 0,
    scheduledCount: 0,
    completedCount: 0,
    notScheduledCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sdcFilter, setSdcFilter] = useState('ALL')

  // Schedule Visit Dialog state
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [selectedLeadForSchedule, setSelectedLeadForSchedule] = useState<PartialLeadItem | null>(null)
  const [scheduleSdcId, setScheduleSdcId] = useState('')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleLocation, setScheduleLocation] = useState('')
  const [scheduleFee, setScheduleFee] = useState('')
  const [scheduleNotes, setScheduleNotes] = useState('')
  const [schedulingBusy, setSchedulingBusy] = useState(false)

  // Follow-up Dialog state
  const [followupDialogOpen, setFollowupDialogOpen] = useState(false)
  const [selectedLeadForFollowup, setSelectedLeadForFollowup] = useState<PartialLeadItem | null>(null)
  const [followupDate, setFollowupDate] = useState('')
  const [followupNotes, setFollowupNotes] = useState('')
  const [followupBusy, setFollowupBusy] = useState(false)

  const fetchPartialLeads = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      if (sdcFilter !== 'ALL') params.set('sdcId', sdcFilter)

      const response = await fetch(`/api/crm/partial-leads?${params.toString()}`, {
        cache: 'no-store',
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to fetch partial leads')
      }

      setLeads(payload.data ?? [])
      if (payload.stats) setStats(payload.stats)
      if (payload.sdcUsers) setSdcUsers(payload.sdcUsers)
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Error loading partial leads')
    } finally {
      setLoading(false)
    }
  }, [sdcFilter, search, statusFilter])

  useEffect(() => {
    void fetchPartialLeads()
  }, [fetchPartialLeads])

  const openScheduleDialog = (lead: PartialLeadItem) => {
    setSelectedLeadForSchedule(lead)
    setScheduleSdcId(lead.sdcAssignee?.id || (sdcUsers[0]?.id ?? ''))
    setScheduleLocation(lead.location !== 'N/A' ? lead.location : '')
    setScheduleFee('0')
    setScheduleNotes('')
    // Default to tomorrow 11:00 AM
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(11, 0, 0, 0)
    setScheduleDate(tomorrow.toISOString().slice(0, 16))
    setScheduleDialogOpen(true)
  }

  const handleConfirmSchedule = async () => {
    if (!selectedLeadForSchedule) return
    if (!scheduleSdcId) {
      toast.error('Please select a Specialist Design Consultant')
      return
    }
    if (!scheduleDate) {
      toast.error('Please choose the visit date and time')
      return
    }
    if (!scheduleLocation.trim()) {
      toast.error('Location is required to schedule a visit')
      return
    }

    try {
      setSchedulingBusy(true)
      const response = await fetch(`/api/lead/${selectedLeadForSchedule.id}/visit-schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitTeamUserId: scheduleSdcId,
          visitType: 'PARTIAL_WORK_VISIT',
          scheduledAt: new Date(scheduleDate).toISOString(),
          location: scheduleLocation.trim(),
          visitFee: Number(scheduleFee) || 0,
          notes: scheduleNotes.trim() || undefined,
        }),
      })

      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to schedule visit')
      }

      toast.success(`Visit scheduled for ${selectedLeadForSchedule.name}`)
      setScheduleDialogOpen(false)
      setSelectedLeadForSchedule(null)
      await fetchPartialLeads()
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Error scheduling visit')
    } finally {
      setSchedulingBusy(false)
    }
  }

  const openFollowupDialog = (lead: PartialLeadItem) => {
    setSelectedLeadForFollowup(lead)
    const nextDay = new Date()
    nextDay.setDate(nextDay.getDate() + 1)
    nextDay.setHours(12, 0, 0, 0)
    setFollowupDate(nextDay.toISOString().slice(0, 16))
    setFollowupNotes('')
    setFollowupDialogOpen(true)
  }

  const handleConfirmFollowup = async () => {
    if (!selectedLeadForFollowup) return
    if (!followupDate) {
      toast.error('Please choose the follow-up date and time')
      return
    }

    try {
      setFollowupBusy(true)
      const meRes = await fetch('/api/me', { cache: 'no-store' })
      const meData = await meRes.json()
      const myId = meData?.id

      if (!myId) {
        throw new Error('User not identified')
      }

      const response = await fetch(`/api/followup/${selectedLeadForFollowup.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedToId: myId,
          followupDate: new Date(followupDate).toISOString(),
          notes: followupNotes.trim() || 'Follow-up scheduled from Partial Leads',
        }),
      })

      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to create follow-up')
      }

      toast.success(`Follow-up saved for ${selectedLeadForFollowup.name}`)
      setFollowupDialogOpen(false)
      setSelectedLeadForFollowup(null)
      await fetchPartialLeads()
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Error creating follow-up')
    } finally {
      setFollowupBusy(false)
    }
  }

  const formatVisitDisplay = (lead: PartialLeadItem) => {
    if (!lead.visit) {
      return (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-amber-300 text-amber-800 bg-amber-50 dark:bg-amber-950/30">
            Not Scheduled
          </Badge>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs text-primary border-primary/40 hover:bg-primary/10"
            onClick={() => openScheduleDialog(lead)}
          >
            <CalendarPlus className="mr-1 h-3.5 w-3.5" />
            Schedule
          </Button>
        </div>
      )
    }

    const date = new Date(lead.visit.scheduledAt)
    const formatted = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    const statusBadge =
      lead.visit.status === 'COMPLETED' ? (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
          Completed
        </Badge>
      ) : lead.visit.status === 'RESCHEDULED' ? (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
          Rescheduled
        </Badge>
      ) : (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
          Scheduled
        </Badge>
      )

    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 font-medium text-xs sm:text-sm text-foreground">
          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span>{formatted}</span>
        </div>
        <div>{statusBadge}</div>
      </div>
    )
  }

  const formatFollowupDisplay = (lead: PartialLeadItem) => {
    if (!lead.lastFollowUp) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">None</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => openFollowupDialog(lead)}
          >
            <Plus className="mr-1 h-3 w-3" />
            Add
          </Button>
        </div>
      )
    }

    const date = new Date(lead.lastFollowUp.followupDate)
    const formatted = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    return (
      <div className="space-y-1 max-w-[220px]">
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-medium text-foreground">{formatted}</span>
          <Badge variant="outline" className="text-[10px] px-1 py-0">
            {lead.lastFollowUp.status}
          </Badge>
        </div>
        {lead.lastFollowUp.notes ? (
          <p className="text-xs text-muted-foreground truncate" title={lead.lastFollowUp.notes}>
            {lead.lastFollowUp.notes}
          </p>
        ) : null}
      </div>
    )
  }

  const unscheduledLeads = useMemo(
    () => leads.filter((l) => !l.visit || l.visit.status === 'CANCELLED'),
    [leads],
  )

  const scheduledLeads = useMemo(
    () => leads.filter((l) => l.visit && (l.visit.status === 'SCHEDULED' || l.visit.status === 'RESCHEDULED')),
    [leads],
  )

  return (
    <div className="min-h-screen bg-background">
      <CrmPageHeader
        title="Partial Leads"
        subtitle="Manage partial leads, track last follow-ups, and schedule visits to Special Design Consultants"
      />

      <main className="w-full px-3 py-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top Summary Stats */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border border-border/80 bg-gradient-to-br from-card via-card to-muted/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Partial Leads
                </p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.totalCount}</p>
              </div>
              <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-blue-200/60 bg-gradient-to-br from-blue-50/40 via-card to-card dark:border-blue-900/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                  Visits Scheduled
                </p>
                <p className="text-2xl font-bold text-blue-800 dark:text-blue-200 mt-1">
                  {stats.scheduledCount}
                </p>
              </div>
              <div className="size-10 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 flex items-center justify-center">
                <CalendarClock className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-emerald-200/60 bg-gradient-to-br from-emerald-50/40 via-card to-card dark:border-emerald-900/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                  Visits Completed
                </p>
                <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-200 mt-1">
                  {stats.completedCount}
                </p>
              </div>
              <div className="size-10 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-amber-200/60 bg-gradient-to-br from-amber-50/40 via-card to-card dark:border-amber-900/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                  Needs Visit Schedule
                </p>
                <p className="text-2xl font-bold text-amber-800 dark:text-amber-200 mt-1">
                  {stats.notScheduledCount}
                </p>
              </div>
              <div className="size-10 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab & Action Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('list')}
              className="font-medium"
            >
              <Users className="mr-1.5 h-4 w-4" />
              Partial Lead List ({leads.length})
            </Button>
            <Button
              variant={activeTab === 'schedule' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('schedule')}
              className="font-medium"
            >
              <CalendarPlus className="mr-1.5 h-4 w-4" />
              Schedule Partial Visit
            </Button>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPartialLeads}
              disabled={loading}
              className="h-9"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <LeadCreateModal
              onCreated={fetchPartialLeads}
              defaultVisitType="PARTIAL_WORK_VISIT"
              defaultScheduleVisit={true}
              buttonLabel="Create Partial Lead"
            />
          </div>
        </div>

        {/* TAB 1: Partial Lead List */}
        {activeTab === 'list' ? (
          <div className="space-y-4">
            {/* Filter Bar */}
            <Card className="border border-border/70">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative flex-1 max-w-full sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by client name, phone, or address..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 h-9 text-sm w-full"
                    />
                  </div>

                  <div className="w-full sm:w-[180px]">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Visit Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Visit Statuses</SelectItem>
                        <SelectItem value="NOT_SCHEDULED">Not Scheduled</SelectItem>
                        <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-full sm:w-[200px]">
                    <Select value={sdcFilter} onValueChange={setSdcFilter}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Filter by Consultant" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Consultants</SelectItem>
                        {sdcUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            {loading ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-3 text-sm text-muted-foreground">Loading partial leads...</p>
              </div>
            ) : leads.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Users className="mx-auto h-10 w-10 text-muted-foreground/60" />
                  <p className="mt-3 text-base font-semibold">No partial leads found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try adjusting your search criteria or create a new partial lead.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-xl border bg-card shadow-sm overflow-x-auto w-full">
                <Table className="min-w-[950px] sm:min-w-full">
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-bold w-[120px]">Client No.</TableHead>
                      <TableHead className="font-bold w-[180px]">Client Name</TableHead>
                      <TableHead className="font-bold w-[150px]">Phone Number</TableHead>
                      <TableHead className="font-bold w-[180px]">Address</TableHead>
                      <TableHead className="font-bold w-[200px]">Visit Date</TableHead>
                      <TableHead className="font-bold w-[200px]">Last Follow-up</TableHead>
                      <TableHead className="font-bold w-[160px]">Specialist SDC</TableHead>
                      <TableHead className="font-bold text-right w-[140px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow key={lead.id} className="hover:bg-muted/30">
                        {/* Client Number */}
                        <TableCell className="font-mono text-xs font-semibold text-muted-foreground">
                          {lead.clientNumber}
                        </TableCell>

                        {/* Client Name */}
                        <TableCell>
                          <Link
                            href={`/visit-team/partial-visits/${lead.id}`}
                            className="font-semibold text-sm text-foreground hover:text-primary hover:underline block"
                          >
                            {lead.name}
                          </Link>
                          {lead.budget ? (
                            <span className="text-xs text-muted-foreground">
                              Budget: {lead.budget.toLocaleString()} ৳
                            </span>
                          ) : null}
                        </TableCell>

                        {/* Phone Number */}
                        <TableCell>
                          <a
                            href={`tel:${lead.phone}`}
                            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-foreground hover:text-primary"
                          >
                            <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            {lead.phone}
                          </a>
                        </TableCell>

                        {/* Address */}
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground max-w-[180px] truncate" title={lead.location}>
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{lead.location}</span>
                          </div>
                        </TableCell>

                        {/* Visit Date */}
                        <TableCell>{formatVisitDisplay(lead)}</TableCell>

                        {/* Last Follow-up */}
                        <TableCell>{formatFollowupDisplay(lead)}</TableCell>

                        {/* Specialist Design Consultant */}
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs">
                            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="font-medium text-foreground">
                              {lead.sdcAssignee?.fullName ?? 'Unassigned'}
                            </span>
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 text-xs"
                              onClick={() => openFollowupDialog(lead)}
                              title="Add Follow-up"
                            >
                              Follow-up
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 px-2 text-xs"
                              asChild
                            >
                              <Link href={`/visit-team/partial-visits/${lead.id}`}>
                                View
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        ) : (
          /* TAB 2: Schedule Partial Visit */
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Quick Scheduler Card */}
              <Card className="border border-border/80">
                <CardHeader className="border-b bg-muted/20 pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarPlus className="h-5 w-5 text-primary" />
                    Schedule Partial Visit
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select a partial lead and assign a Specialist Design Consultant for visit execution.
                  </p>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4">
                  {/* Select Lead */}
                  <div className="space-y-1.5">
                    <Label htmlFor="quick-lead-select">Select Partial Lead *</Label>
                    <Select
                      value={selectedLeadForSchedule?.id || ''}
                      onValueChange={(val) => {
                        const target = leads.find((l) => l.id === val)
                        if (target) {
                          setSelectedLeadForSchedule(target)
                          setScheduleLocation(target.location !== 'N/A' ? target.location : '')
                          setScheduleSdcId(target.sdcAssignee?.id || (sdcUsers[0]?.id ?? ''))
                        }
                      }}
                    >
                      <SelectTrigger id="quick-lead-select">
                        <SelectValue placeholder="Choose a partial lead to schedule..." />
                      </SelectTrigger>
                      <SelectContent>
                        {unscheduledLeads.length > 0 ? (
                          <>
                            <div className="px-2 py-1 text-[11px] font-bold text-amber-600 uppercase tracking-wider">
                              Unscheduled Leads ({unscheduledLeads.length})
                            </div>
                            {unscheduledLeads.map((l) => (
                              <SelectItem key={l.id} value={l.id}>
                                {l.name} ({l.phone}) - {l.location}
                              </SelectItem>
                            ))}
                          </>
                        ) : null}
                        {scheduledLeads.length > 0 ? (
                          <>
                            <div className="px-2 py-1 text-[11px] font-bold text-blue-600 uppercase tracking-wider mt-2">
                              Already Scheduled (Reschedule)
                            </div>
                            {scheduledLeads.map((l) => (
                              <SelectItem key={l.id} value={l.id}>
                                {l.name} ({l.phone})
                              </SelectItem>
                            ))}
                          </>
                        ) : null}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Select SDC */}
                  <div className="space-y-1.5">
                    <Label htmlFor="quick-sdc-select">Specialist Design Consultant *</Label>
                    <Select value={scheduleSdcId} onValueChange={setScheduleSdcId}>
                      <SelectTrigger id="quick-sdc-select">
                        <SelectValue placeholder="Select consultant..." />
                      </SelectTrigger>
                      <SelectContent>
                        {sdcUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.fullName} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Visit Date & Time */}
                  <div className="space-y-1.5">
                    <Label htmlFor="quick-visit-date">Visit Date & Time *</Label>
                    <Input
                      id="quick-visit-date"
                      type="datetime-local"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                    />
                  </div>

                  {/* Location */}
                  <div className="space-y-1.5">
                    <Label htmlFor="quick-location">Client Visit Address / Location *</Label>
                    <Input
                      id="quick-location"
                      value={scheduleLocation}
                      onChange={(e) => setScheduleLocation(e.target.value)}
                      placeholder="e.g. House 12, Road 4, Dhanmondi, Dhaka"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="quick-fee">Visit Fee (৳)</Label>
                      <Input
                        id="quick-fee"
                        type="number"
                        value={scheduleFee}
                        onChange={(e) => setScheduleFee(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="quick-type">Visit Type</Label>
                      <Input
                        id="quick-type"
                        value="PARTIAL_WORK_VISIT"
                        disabled
                        className="bg-muted text-muted-foreground text-xs"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <Label htmlFor="quick-notes">Visit Notes / Client Requirements</Label>
                    <Textarea
                      id="quick-notes"
                      rows={2}
                      value={scheduleNotes}
                      onChange={(e) => setScheduleNotes(e.target.value)}
                      placeholder="Special instructions or client scope preferences..."
                    />
                  </div>

                  <Button
                    onClick={handleConfirmSchedule}
                    disabled={schedulingBusy || !selectedLeadForSchedule}
                    className="w-full mt-2"
                  >
                    {schedulingBusy ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Scheduling...
                      </>
                    ) : (
                      <>
                        <CalendarPlus className="mr-2 h-4 w-4" />
                        Confirm & Schedule Partial Visit
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Scheduled Partial Visits Overview List */}
              <Card className="border border-border/80">
                <CardHeader className="border-b bg-muted/20 pb-4">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CalendarClock className="h-5 w-5 text-blue-600" />
                      Scheduled Partial Visits ({scheduledLeads.length})
                    </span>
                    <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                      <Link href="/visit-team/partial-visit-queue">
                        Open Calendar View
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3 max-h-[560px] overflow-y-auto">
                  {scheduledLeads.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      No visits currently scheduled. Select a partial lead on the left to schedule.
                    </div>
                  ) : (
                    scheduledLeads.map((l) => (
                      <div
                        key={l.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border bg-card hover:border-primary/40 transition"
                      >
                        <div className="space-y-1 min-w-0">
                          <Link
                            href={`/visit-team/partial-visits/${l.id}`}
                            className="font-semibold text-sm hover:underline text-foreground block truncate"
                          >
                            {l.name}
                          </Link>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {l.phone}
                            </span>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {l.location}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-0.5">
                            <span className="inline-flex items-center gap-1 font-medium text-foreground">
                              <Clock className="h-3 w-3 text-primary" />
                              {l.visit ? new Date(l.visit.scheduledAt).toLocaleString() : 'N/A'}
                            </span>
                            <span>•</span>
                            <span>SDC: {l.visit?.assignedTo?.fullName ?? l.sdcAssignee?.fullName ?? 'N/A'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => openScheduleDialog(l)}
                          >
                            Reschedule
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 text-xs"
                            asChild
                          >
                            <Link href={`/visit-team/partial-visits/${l.id}`}>
                              Lead Page
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* SCHEDULE VISIT DIALOG */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Partial Visit</DialogTitle>
            <DialogDescription>
              Assign a Special Design Consultant and choose visit date & time for {selectedLeadForSchedule?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Specialist Design Consultant *</Label>
              <Select value={scheduleSdcId} onValueChange={setScheduleSdcId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select consultant..." />
                </SelectTrigger>
                <SelectContent>
                  {sdcUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Visit Date & Time *</Label>
              <Input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Visit Location / Address *</Label>
              <Input
                value={scheduleLocation}
                onChange={(e) => setScheduleLocation(e.target.value)}
                placeholder="Enter client address"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Visit Fee (৳)</Label>
              <Input
                type="number"
                value={scheduleFee}
                onChange={(e) => setScheduleFee(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                rows={2}
                value={scheduleNotes}
                onChange={(e) => setScheduleNotes(e.target.value)}
                placeholder="Instructions for the visit consultant..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setScheduleDialogOpen(false)}
              disabled={schedulingBusy}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmSchedule} disabled={schedulingBusy}>
              {schedulingBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                'Confirm Schedule'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FOLLOW-UP DIALOG */}
      <Dialog open={followupDialogOpen} onOpenChange={setFollowupDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Follow-up</DialogTitle>
            <DialogDescription>
              Schedule next follow-up call/meeting for {selectedLeadForFollowup?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Follow-up Date & Time *</Label>
              <Input
                type="datetime-local"
                value={followupDate}
                onChange={(e) => setFollowupDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notes / Outcome</Label>
              <Textarea
                rows={3}
                value={followupNotes}
                onChange={(e) => setFollowupNotes(e.target.value)}
                placeholder="Summary of conversation or next steps..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFollowupDialogOpen(false)}
              disabled={followupBusy}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmFollowup} disabled={followupBusy}>
              {followupBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Follow-up'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
