'use client'

import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DateRangePicker, type DateRange } from '@/components/ui/date-range-picker'
import { format } from 'date-fns'
import {
  Plus,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileImage,
  FileText,
  FileVideo,
  CheckCircle2,
  CalendarDays,
  ClipboardList,
  CheckCheck,
  RotateCcw,
  Ban,
  UserCheck,
  Users,
} from 'lucide-react'
import { CrmPageHeader } from '@/components/crm/shared/page-header'
import { fetchMeCached } from '@/lib/client-me'
import { toast } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'
import { hasVisitTeamLeadershipRole } from '@/lib/visit-team-roles'
import {
  budgetRangeOptions,
  clientMoodOptions,
  clientPersonalityOptions,
  clientPotentialityOptions,
  projectTypeOptions,
  stylePreferenceOptions,
  urgencyOptions,
} from '@/lib/visit-result-options'

type VisitRecord = {
  id: string
  leadId: string
  scheduledAt: string
  location: string
  visitFee: number | null
  projectSqft: number | null
  projectStatus: string | null
  status: string
  notes: string | null
  lead: {
    id: string
    name: string
    phone: string
    location: string | null
    assignments?: Array<{
      id: string
      department: string
      user: {
        id: string
        fullName: string
        email: string
      } | null
    }>
  }
  assignedTo: {
    id: string
    fullName: string
    email: string
    phone: string
  } | null
  supportAssignments?: Array<{
    id: string
    supportUserId: string
    supportUser: {
      id: string
      fullName: string
      email: string
    }
    result?: {
      id: string
      completedAt: string
    } | null
  }>
  supportResults?: Array<{
    id: string
    supportUserId: string
    clientName: string
    projectArea: string
    projectStatus: string
    extraConcern: string | null
    completedAt: string
  }>
  createdBy: {
    id: string
    fullName: string
  } | null
}

type ProjectStatusOption = {
  value: string
  label: string
}

type ApiResponse = {
  success: boolean
  data?: VisitRecord[]
  error?: string
}

type VisitTeamMember = {
  id: string
  fullName: string
  email: string
}

type SupportMemberOption = {
  id: string
  fullName: string
  email: string
}

type SubmitVisitResultResponse = {
  success?: boolean
  error?: string
  uploadWarnings?: {
    failedCount?: number
    failedFiles?: string[]
  } | null
}

type VisitWorkflowSettingsResponse = {
  success: boolean
  data?: {
    control?: {
      supportDataEnabled?: boolean
    }
  }
}

type VisitsCacheEntry = {
  savedAt: number
  data: VisitRecord[]
}

const VISITS_CACHE_TTL_MS = 60_000
let visitsCacheByScope: Record<string, VisitsCacheEntry | undefined> = {}
const visitsRequestPromiseByScope: Record<string, Promise<VisitRecord[]> | undefined> = {}

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  SCHEDULED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  rescheduled: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
  RESCHEDULED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
}

const formatVisitStatus = (status: string) => (status === 'SCHEDULED' ? 'PENDING' : status)
const calendarWeekLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const selectUnsetValue = '__UNSET__'
const defaultProjectStatusOptions: ProjectStatusOption[] = [
  { value: 'UNDER_CONSTRUCTION', label: 'Under Construction' },
  { value: 'READY', label: 'Ready' },
]

type VisitsPageProps = {
  forceAssignedOnly?: boolean
  leadHrefPrefix?: string
  restrictToCreator?: boolean
  allowCompleteVisit?: boolean
  blurUnassignedVisitDetails?: boolean
  visitScope?: 'default' | 'all' | 'sr-assigned'
  allowManageAssignment?: boolean
  showScheduleButton?: boolean
  showSummaryDashboard?: boolean
  pageTitle?: string
  pageSubtitle?: string
  cardNavigatesToLead?: boolean
  visitTeamView?: boolean
}

function getVisitScheduleListUrl(visitScope: NonNullable<VisitsPageProps['visitScope']>) {
  if (visitScope === 'all') return '/api/visit-schedule?scope=all'
  if (visitScope === 'sr-assigned') return '/api/visit-schedule?scope=sr-assigned'
  return '/api/visit-schedule'
}

export function VisitsPageView({
  forceAssignedOnly = false,
  leadHrefPrefix = '/crm/jr/leads',
  restrictToCreator = true,
  allowCompleteVisit = false,
  blurUnassignedVisitDetails = false,
  visitScope = 'default',
  allowManageAssignment = true,
  showScheduleButton = true,
  showSummaryDashboard = false,
  pageTitle = 'Visits',
  pageSubtitle = 'Schedule and manage site visits',
  cardNavigatesToLead = false,
  visitTeamView = false,
}: VisitsPageProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(() => (visitTeamView ? 'list' : 'calendar'))
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [visits, setVisits] = useState<VisitRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [supportDataEnabled, setSupportDataEnabled] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [actorDepartments, setActorDepartments] = useState<Set<string>>(new Set())
  const [isAdminActor, setIsAdminActor] = useState(false)
  const [isVisitTeamLeaderActor, setIsVisitTeamLeaderActor] = useState(false)
  const [requestOpen, setRequestOpen] = useState(false)
  const [requestVisitId, setRequestVisitId] = useState('')
  const [requestType, setRequestType] = useState<'RESCHEDULE' | 'CANCEL'>('RESCHEDULE')
  const [requestReason, setRequestReason] = useState('')
  const [requestScheduleAt, setRequestScheduleAt] = useState('')
  const [requestError, setRequestError] = useState<string | null>(null)
  const [requestSaving, setRequestSaving] = useState(false)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [completeVisitId, setCompleteVisitId] = useState('')
  const [completeRole, setCompleteRole] = useState<'LEAD' | 'SUPPORT'>('LEAD')
  const [completeSummary, setCompleteSummary] = useState('')
  const [completeClientMood, setCompleteClientMood] = useState('')
  const [completeNote, setCompleteNote] = useState('')
  const [completeProjectStatus, setCompleteProjectStatus] = useState('')
  const [completeClientPotentiality, setCompleteClientPotentiality] = useState('')
  const [completeProjectType, setCompleteProjectType] = useState('')
  const [completeClientPersonality, setCompleteClientPersonality] = useState('')
  const [completeBudgetRange, setCompleteBudgetRange] = useState('')
  const [completeTimelineUrgency, setCompleteTimelineUrgency] = useState('')
  const [completeStylePreference, setCompleteStylePreference] = useState('')
  const [supportClientName, setSupportClientName] = useState('')
  const [supportProjectArea, setSupportProjectArea] = useState('')
  const [supportProjectStatus, setSupportProjectStatus] = useState('')
  const [supportExtraConcern, setSupportExtraConcern] = useState('')
  const [projectStatusOptions, setProjectStatusOptions] =
    useState<ProjectStatusOption[]>(defaultProjectStatusOptions)
  const [completeFiles, setCompleteFiles] = useState<File[]>([])
  const [uploadingFileNames, setUploadingFileNames] = useState<string[]>([])
  const [failedUploadFiles, setFailedUploadFiles] = useState<string[]>([])
  const [completeError, setCompleteError] = useState<string | null>(null)
  const [submittingComplete, setSubmittingComplete] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignVisitId, setAssignVisitId] = useState('')
  const [assignMemberId, setAssignMemberId] = useState('')
  const [assignReason, setAssignReason] = useState('Visit assignment updated.')
  const [assignMembers, setAssignMembers] = useState<VisitTeamMember[]>([])
  const [assignError, setAssignError] = useState<string | null>(null)
  const [assignLoadingMembers, setAssignLoadingMembers] = useState(false)
  const [assignSaving, setAssignSaving] = useState(false)
  const [supportDialogOpen, setSupportDialogOpen] = useState(false)
  const [supportDialogVisitId, setSupportDialogVisitId] = useState('')
  const [supportDialogError, setSupportDialogError] = useState<string | null>(null)
  const [supportDialogSelection, setSupportDialogSelection] = useState('')
  const [supportDialogMembers, setSupportDialogMembers] = useState<SupportMemberOption[]>([])
  const [supportDialogLoading, setSupportDialogLoading] = useState(false)
  const [supportDialogSaving, setSupportDialogSaving] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editVisitId, setEditVisitId] = useState('')
  const [editScheduledAt, setEditScheduledAt] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editVisitFee, setEditVisitFee] = useState('')
  const [editProjectSqft, setEditProjectSqft] = useState('')
  const [editProjectStatus, setEditProjectStatus] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [listFilter, setListFilter] = useState<
    'ALL' | 'SCHEDULED' | 'COMPLETED' | 'RESCHEDULED' | 'CANCELLED' | 'LEAD' | 'SUPPORT'
  >('ALL')
  const [listDateFrom, setListDateFrom] = useState('')
  const [listDateTo, setListDateTo] = useState('')
  const [listDateRange, setListDateRange] = useState<DateRange | undefined>(undefined)
  const [listMemberFilter, setListMemberFilter] = useState('ALL')
  const [srCrmFilter, setSrCrmFilter] = useState('ALL')
  const [listViewMode, setListViewMode] = useState<'table' | 'card'>(() => (visitTeamView ? 'card' : 'table'))
  const listDetailsRef = useRef<HTMLDivElement | null>(null)

  const formatLocalDateKey = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return FileImage
    if (file.type.startsWith('video/')) return FileVideo
    return FileText
  }

  const selectedFilesStatusList =
    completeFiles.length > 0 ? (
      <div className="space-y-1 rounded-md border border-border/70 bg-muted/20 p-2">
        {completeFiles.map((file, index) => {
          const isUploading = submittingComplete && uploadingFileNames.includes(file.name)
          const Icon = getFileIcon(file)
          return (
            <div key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-2 text-xs">
              <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                <Icon className="size-3.5 shrink-0" />
                <span className="truncate">{file.name}</span>
              </div>
              <div className="shrink-0">
                {isUploading ? (
                  <span className="inline-flex items-center gap-1 text-primary">
                    <Loader2 className="size-3.5 animate-spin" />
                    Uploading...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="size-3.5" />
                    Ready
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    ) : null

  useEffect(() => {
    setSelectedDate(formatLocalDateKey(new Date()))
  }, [])

  useEffect(() => {
    if (!visitTeamView) return
    setActiveTab('list')
    setListViewMode('card')
  }, [visitTeamView])

  useEffect(() => {
    const loadVisits = async () => {
      const scopeKey = visitScope
      try {
        const cached = visitsCacheByScope[scopeKey] ?? null
        const cacheIsFresh =
          cached && Date.now() - cached.savedAt < VISITS_CACHE_TTL_MS
        if (cacheIsFresh) {
          setVisits(cached.data)
          setError(null)
          return
        }

        if (!visitsRequestPromiseByScope[scopeKey]) {
          visitsRequestPromiseByScope[scopeKey] = (async () => {
            const [response, workflowResponse] = await Promise.all([
              fetch(getVisitScheduleListUrl(visitScope)),
              fetch('/api/visit-team/workflow-settings', { cache: 'no-store' }).catch(() => null),
            ])
            const payload = (await response.json()) as ApiResponse
            if (!response.ok || !payload.success) {
              const message =
                payload?.error
                  ? String(payload.error)
                  : `Failed to load visits (status ${response.status})`
              throw new Error(message)
            }
            if (workflowResponse) {
              const workflowPayload = (await workflowResponse.json()) as VisitWorkflowSettingsResponse
              if (workflowResponse.ok && workflowPayload.success) {
                setSupportDataEnabled(workflowPayload.data?.control?.supportDataEnabled !== false)
              }
            }
            return payload.data ?? []
          })()
            .finally(() => {
              delete visitsRequestPromiseByScope[scopeKey]
            })
        }

        const nextVisits = await visitsRequestPromiseByScope[scopeKey]
        visitsCacheByScope[scopeKey] = { data: nextVisits, savedAt: Date.now() }
        setVisits(nextVisits)
        setError(null)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load visits'
        console.error('Error loading visits:', error)
        setError(message)
        setVisits([])
      } finally {
        setLoading(false)
      }
    }

    loadVisits()
  }, [visitScope])

  useEffect(() => {
    if (typeof window === 'undefined') return

    fetchMeCached()
      .then((data) => {
        if (data?.id) {
          setCurrentUserId(String(data.id))
        }
        const departments = Array.isArray(data?.userDepartments)
          ? data.userDepartments
              .map((row) => row?.department?.name)
              .filter((name): name is string => Boolean(name))
          : []
        setActorDepartments(new Set(departments))
        setIsAdminActor(departments.includes('ADMIN'))
        const roleNames = Array.isArray((data as { userRoles?: unknown }).userRoles)
          ? ((data as { userRoles?: Array<{ role?: { name?: string | null } | null } | null> }).userRoles ?? [])
              .map((item) => item?.role?.name)
              .filter((name): name is string => Boolean(name))
          : []
        setIsVisitTeamLeaderActor(hasVisitTeamLeadershipRole(roleNames))
      })
      .catch((error) => {
        console.error('Error loading current user:', error)
      })
  }, [])

  useEffect(() => {
    let cancelled = false
    const loadProjectStatusOptions = async () => {
      try {
        const response = await fetch('/api/project-status-options', { cache: 'no-store' })
        const payload = await response.json()
        if (!response.ok || !payload?.success) return
        const options = Array.isArray(payload?.data)
          ? payload.data.filter(
              (item: unknown): item is ProjectStatusOption =>
                Boolean(item) &&
                typeof (item as { value?: unknown }).value === 'string' &&
                typeof (item as { label?: unknown }).label === 'string',
            )
          : []
        if (!cancelled && options.length > 0) {
          setProjectStatusOptions(options)
        }
      } catch {
        // Keep default options if request fails.
      }
    }

    void loadProjectStatusOptions()
    return () => {
      cancelled = true
    }
  }, [])

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const numericSearch = searchTerm.replace(/\D/g, '')

  const getSeniorCrmAssignment = (visit: VisitRecord) => {
    return (visit.lead?.assignments ?? []).find((assignment) => assignment.department === 'SR_CRM') ?? null
  }

  const getVisitAddress = (visit: VisitRecord) => visit.location || visit.lead?.location || 'N/A'

  const getVisitTeamMembers = (visit: VisitRecord) => {
    const members: Array<{ id: string; name: string; role: 'LEAD' | 'SUPPORT' }> = []
    if (visit.assignedTo?.id) {
      members.push({ id: visit.assignedTo.id, name: visit.assignedTo.fullName || 'Unassigned', role: 'LEAD' })
    }
    ;(visit.supportAssignments ?? []).forEach((item) => {
      if (visit.assignedTo?.id && item.supportUserId === visit.assignedTo.id) return
      members.push({ id: item.supportUserId, name: item.supportUser.fullName, role: 'SUPPORT' })
    })
    return members
  }

  const formatDateTimeLocal = (value: string | Date) => {
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    const offsetMs = date.getTimezoneOffset() * 60_000
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
  }

  const srCrmOptions = useMemo(() => {
    const srCrmMap = new Map<string, string>()
    visits.forEach((visit) => {
      const assignment = getSeniorCrmAssignment(visit)
      if (!assignment?.user?.id) return
      srCrmMap.set(assignment.user.id, assignment.user.fullName || 'Unknown')
    })
    return Array.from(srCrmMap.entries())
      .map(([id, fullName]) => ({ id, fullName }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
  }, [visits])

  const filteredVisits = useMemo(() => {
    return visits.filter((visit) => {
      const assignment = getSeniorCrmAssignment(visit)
      if (srCrmFilter === 'UNASSIGNED' && assignment?.user?.id) return false
      if (srCrmFilter !== 'ALL' && srCrmFilter !== 'UNASSIGNED' && assignment?.user?.id !== srCrmFilter) {
        return false
      }

      if (!normalizedSearch && !numericSearch) return true
      const leadName = visit.lead?.name?.toLowerCase() ?? ''
      const leadPhone = visit.lead?.phone?.replace(/\D/g, '') ?? ''
      const nameMatch = normalizedSearch ? leadName.includes(normalizedSearch) : false
      const phoneMatch = numericSearch ? leadPhone.includes(numericSearch) : false
      return nameMatch || phoneMatch
    })
  }, [visits, normalizedSearch, numericSearch, srCrmFilter])

  const listMemberOptions = useMemo(() => {
    const membersMap = new Map<string, string>()
    visits.forEach((visit) => {
      if (!canViewVisit(visit)) return
      if (!visit.assignedTo?.id) return
      membersMap.set(visit.assignedTo.id, visit.assignedTo.fullName || 'Unknown')
    })
    return Array.from(membersMap.entries())
      .map(([id, fullName]) => ({ id, fullName }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
  }, [visits, isAdminActor, isVisitTeamLeaderActor, currentUserId, blurUnassignedVisitDetails])

  const listDateMemberFilteredVisits = useMemo(() => {
    return filteredVisits.filter((visit) => {
      if (!canViewVisit(visit)) return false
      const visitDate = formatLocalDateKey(new Date(visit.scheduledAt))
      if (listDateFrom && visitDate < listDateFrom) return false
      if (listDateTo && visitDate > listDateTo) return false
      if (!visitTeamView && listMemberFilter !== 'ALL' && visit.assignedTo?.id !== listMemberFilter) return false
      return true
    })
  }, [
    filteredVisits,
    listDateFrom,
    listDateTo,
    listMemberFilter,
    visitTeamView,
    isAdminActor,
    isVisitTeamLeaderActor,
    currentUserId,
    blurUnassignedVisitDetails,
  ])


  const monthStartKey = useMemo(
    () => formatLocalDateKey(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)),
    [currentDate],
  )
  const monthEndKey = useMemo(
    () => formatLocalDateKey(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)),
    [currentDate],
  )

  const monthlyVisibleVisits = useMemo(() => {
    if (visitTeamView) return listDateMemberFilteredVisits
    return filteredVisits.filter((visit) => {
      if (!canViewVisit(visit)) return false
      const visitDate = formatLocalDateKey(new Date(visit.scheduledAt))
      if (visitDate < monthStartKey || visitDate > monthEndKey) return false
      if (listMemberFilter !== 'ALL' && visit.assignedTo?.id !== listMemberFilter) return false
      return true
    })
  }, [
    filteredVisits,
    listDateMemberFilteredVisits,
    monthStartKey,
    monthEndKey,
    listMemberFilter,
    visitTeamView,
    isAdminActor,
    isVisitTeamLeaderActor,
    currentUserId,
    blurUnassignedVisitDetails,
  ])

  const monthlyScheduledVisits = useMemo(
    () => monthlyVisibleVisits.filter((v) => v.status === 'SCHEDULED'),
    [monthlyVisibleVisits],
  )
  const monthlyCompletedVisits = useMemo(
    () => monthlyVisibleVisits.filter((v) => v.status === 'COMPLETED'),
    [monthlyVisibleVisits],
  )
  const monthlyRescheduledVisits = useMemo(
    () => monthlyVisibleVisits.filter((v) => v.status === 'RESCHEDULED'),
    [monthlyVisibleVisits],
  )
  const monthlyCancelledVisits = useMemo(
    () => monthlyVisibleVisits.filter((v) => v.status === 'CANCELLED'),
    [monthlyVisibleVisits],
  )
  const monthlyLeadRoleVisits = useMemo(
    () => monthlyVisibleVisits.filter((visit) => getVisitRole(visit) === 'LEAD'),
    [monthlyVisibleVisits, currentUserId],
  )
  const monthlySupportRoleVisits = useMemo(
    () => monthlyVisibleVisits.filter((visit) => getVisitRole(visit) === 'SUPPORT'),
    [monthlyVisibleVisits, currentUserId],
  )

  const completedVisits = useMemo(
    () => listDateMemberFilteredVisits.filter((v) => v.status === 'COMPLETED'),
    [listDateMemberFilteredVisits]
  )
  // Group visits by date (YYYY-MM-DD from ISO string)
  const visitsByDate = useMemo(() => {
    const grouped: Record<string, VisitRecord[]> = {}
    filteredVisits.forEach((visit) => {
      const scheduledDate = new Date(visit.scheduledAt)
      const dateStr = Number.isNaN(scheduledDate.getTime())
        ? visit.scheduledAt.split('T')[0]
        : formatLocalDateKey(scheduledDate)
      if (!grouped[dateStr]) grouped[dateStr] = []
      grouped[dateStr].push(visit)
    })
    return grouped
  }, [filteredVisits])

  // Get calendar days for current month
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const daysInMonth = getDaysInMonth(currentDate)
  const firstDay = getFirstDayOfMonth(currentDate)
  const calendarDays: Array<number | null> = [
    ...Array.from({ length: firstDay }, () => null as null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const getDateString = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    return formatLocalDateKey(date)
  }

  const getVisitsForDay = (day: number) => {
    const dateStr = getDateString(day)
    return visitsByDate[dateStr] || []
  }

  const mobileCalendarRows = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1
      const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const dateString = formatLocalDateKey(dateObj)
      const dayLabel = calendarWeekLabels[dateObj.getDay()]
      return {
        day,
        dateString,
        dayLabel,
        visits: visitsByDate[dateString] || [],
      }
    })
  }, [currentDate, daysInMonth, visitsByDate])

  function canViewVisit(visit: VisitRecord) {
    if (visitTeamView) return getVisitRole(visit) !== 'NONE'
    if (isAdminActor || isVisitTeamLeaderActor) return true
    if (blurUnassignedVisitDetails) {
      return getVisitRole(visit) !== 'NONE'
    }
    if (forceAssignedOnly) return true
    if (!restrictToCreator) return true
    const creatorId = visit.createdBy?.id
    if (!currentUserId || !creatorId) return true
    return creatorId === currentUserId
  }

  function getVisitRole(visit: VisitRecord): 'LEAD' | 'SUPPORT' | 'NONE' {
    if (!currentUserId) return 'NONE'
    if (visit.assignedTo?.id === currentUserId) return 'LEAD'
    const isSupport = (visit.supportAssignments ?? []).some((item) => item.supportUserId === currentUserId)
    return isSupport ? 'SUPPORT' : 'NONE'
  }
  const getPrimarySupportAssignment = (visit: VisitRecord) => {
    return (visit.supportAssignments ?? [])[0] ?? null
  }
  const getCurrentSupportResult = (visit: VisitRecord) => {
    if (!currentUserId) return null
    return (visit.supportResults ?? []).find((item) => item.supportUserId === currentUserId) ?? null
  }
  const hasSupportDataSubmitted = (visit: VisitRecord) => {
    if (!currentUserId) return false
    const assignment = (visit.supportAssignments ?? []).find((item) => item.supportUserId === currentUserId) ?? null
    if (assignment?.result) return true
    return Boolean(getCurrentSupportResult(visit))
  }
  const canSubmitSupportData = (visit: VisitRecord) => {
    if (!currentUserId) return false
    return getPrimarySupportAssignment(visit)?.supportUserId === currentUserId
  }
  const hasPendingPrimarySupportData = (visit: VisitRecord | null) => {
    if (!visit) return false
    const primarySupportAssignment = getPrimarySupportAssignment(visit)
    return Boolean(primarySupportAssignment && !primarySupportAssignment.result)
  }
  const isSupportReadOnly = !supportDataEnabled

  const leadRoleVisits = useMemo(
    () => listDateMemberFilteredVisits.filter((visit) => getVisitRole(visit) === 'LEAD'),
    [listDateMemberFilteredVisits, currentUserId],
  )
  const supportRoleVisits = useMemo(
    () => listDateMemberFilteredVisits.filter((visit) => getVisitRole(visit) === 'SUPPORT'),
    [listDateMemberFilteredVisits, currentUserId],
  )
  const filteredListVisits = useMemo(() => {
    if (listFilter === 'ALL') return listDateMemberFilteredVisits
    if (listFilter === 'LEAD') return leadRoleVisits
    if (listFilter === 'SUPPORT') return supportRoleVisits
    return listDateMemberFilteredVisits.filter((visit) => visit.status === listFilter)
  }, [listDateMemberFilteredVisits, listFilter, leadRoleVisits, supportRoleVisits])
  const listFilterLabel = useMemo(() => {
    if (listFilter === 'ALL') return 'All Visits'
    if (listFilter === 'LEAD') return 'Leading Visits'
    if (listFilter === 'SUPPORT') return 'Supporting Visits'
    return `${formatVisitStatus(listFilter)} Visits`
  }, [listFilter])

  const restrictedMessage = blurUnassignedVisitDetails
    ? 'Restricted to assigned team'
    : 'Restricted to assigned CRM'

  const canManageSupportForVisit = (visit: VisitRecord) => {
    if (!currentUserId) return false
    if (isAdminActor || isVisitTeamLeaderActor) return true
    return visit.assignedTo?.id === currentUserId
  }
  const canRequestVisitUpdate = (visit: VisitRecord) => {
    if (visit.status === 'COMPLETED' || visit.status === 'CANCELLED') return false
    const isElevatedCrm = actorDepartments.has('JR_CRM') || actorDepartments.has('ADMIN')
    if (isElevatedCrm || isVisitTeamLeaderActor) return true
    return getVisitRole(visit) === 'LEAD'
  }

  const shouldIgnoreCardNavigation = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false
    return Boolean(target.closest('button, a, input, textarea, select, [role="button"]'))
  }

  const openListDetails = (
    filter: 'ALL' | 'SCHEDULED' | 'COMPLETED' | 'RESCHEDULED' | 'CANCELLED' | 'LEAD' | 'SUPPORT',
  ) => {
    setListFilter(filter)
    setActiveTab('list')
    requestAnimationFrame(() => {
      listDetailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const openCompleteDialog = (visit: VisitRecord) => {
    const role = getVisitRole(visit)
    if (role === 'NONE') return
    if (role === 'SUPPORT' && isSupportReadOnly) {
      toast.error('Support data workflow is disabled by admin. Support members are read-only.')
      return
    }
    if (role === 'SUPPORT' && !canSubmitSupportData(visit)) {
      toast.error('Only the first assigned support member can submit support data for this visit.')
      return
    }
    setCompleteVisitId(visit.id)
    setCompleteRole(role)
    setCompleteSummary('')
    setCompleteClientMood('')
    setCompleteNote('')
    setCompleteProjectStatus('')
    setCompleteClientPotentiality('')
    setCompleteProjectType('')
    setCompleteClientPersonality('')
    setCompleteBudgetRange('')
    setCompleteTimelineUrgency('')
    setCompleteStylePreference('')
    const existingSupportResult = getCurrentSupportResult(visit)
    setSupportClientName(existingSupportResult?.clientName ?? visit.lead?.name ?? '')
    setSupportProjectArea(
      existingSupportResult?.projectArea ??
        (visit.projectSqft !== null && visit.projectSqft !== undefined ? String(visit.projectSqft) : ''),
    )
    setSupportProjectStatus(existingSupportResult?.projectStatus ?? visit.projectStatus ?? '')
    setSupportExtraConcern(existingSupportResult?.extraConcern ?? '')
    setCompleteFiles([])
    setUploadingFileNames([])
    setFailedUploadFiles([])
    setCompleteError(null)
    setCompleteOpen(true)
  }

  const openRequestDialog = (visit: VisitRecord, type: 'RESCHEDULE' | 'CANCEL') => {
    if (!canRequestVisitUpdate(visit)) return
    setRequestVisitId(visit.id)
    setRequestType(type)
    setRequestReason('')
    setRequestScheduleAt('')
    setRequestError(null)
    setRequestOpen(true)
  }

  const submitVisitUpdateRequest = async () => {
    if (!requestVisitId) return
    if (!requestReason.trim()) {
      setRequestError('Reason is required.')
      return
    }
    if (requestType === 'RESCHEDULE' && !requestScheduleAt) {
      setRequestError('Reschedule date & time is required.')
      return
    }

    setRequestSaving(true)
    setRequestError(null)
    try {
      const response = await fetch(`/api/visit-schedule/${requestVisitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: requestType === 'RESCHEDULE' ? 'RESCHEDULED' : 'CANCELLED',
          reason: requestReason.trim(),
          scheduledAt: requestType === 'RESCHEDULE' ? new Date(requestScheduleAt).toISOString() : undefined,
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to update visit')
      }

      visitsCacheByScope = {}
      const refreshResponse = await fetch(getVisitScheduleListUrl(visitScope), {
        cache: 'no-store',
      })
      const refreshPayload = (await refreshResponse.json()) as ApiResponse
      if (!refreshResponse.ok || !refreshPayload.success) {
        throw new Error(refreshPayload?.error || 'Failed to refresh visits')
      }
      visitsCacheByScope[visitScope] = { data: refreshPayload.data ?? [], savedAt: Date.now() }
      setVisits(refreshPayload.data ?? [])

      setRequestOpen(false)
      setRequestVisitId('')
      setRequestReason('')
      setRequestScheduleAt('')
      toast.success(requestType === 'RESCHEDULE' ? 'Visit rescheduled.' : 'Visit cancelled.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update visit'
      setRequestError(message)
      toast.error(message)
    } finally {
      setRequestSaving(false)
    }
  }

  const openAssignDialog = async (visit: VisitRecord) => {
    setAssignVisitId(visit.id)
    setAssignMemberId(visit.assignedTo?.id ?? '')
    setAssignReason('Visit assignment updated.')
    setAssignError(null)
    setAssignOpen(true)
    if (assignMembers.length > 0) return
    setAssignLoadingMembers(true)
    try {
      const response = await fetch('/api/department/available/VISIT_TEAM', {
        cache: 'no-store',
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load visit team members')
      }
      const members = Array.isArray(payload.users) ? payload.users : []
      setAssignMembers(
        members.map((member: VisitTeamMember) => ({
          id: member.id,
          fullName: member.fullName,
          email: member.email,
        })),
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load visit team members'
      setAssignError(message)
      toast.error(message)
    } finally {
      setAssignLoadingMembers(false)
    }
  }

  const submitAssignVisit = async () => {
    if (!assignVisitId) return
    if (!assignMemberId) {
      setAssignError('Please select a visit member.')
      return
    }

    setAssignSaving(true)
    setAssignError(null)
    try {
      const response = await fetch(`/api/visit-schedule/${assignVisitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitTeamUserId: assignMemberId,
          reason: assignReason.trim() || 'Visit assignment updated.',
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to update visit assignment')
      }

      visitsCacheByScope = {}
      const refreshResponse = await fetch(getVisitScheduleListUrl(visitScope), {
        cache: 'no-store',
      })
      const refreshPayload = (await refreshResponse.json()) as ApiResponse
      if (!refreshResponse.ok || !refreshPayload.success) {
        throw new Error(refreshPayload?.error || 'Failed to refresh visits')
      }
      visitsCacheByScope[visitScope] = { data: refreshPayload.data ?? [], savedAt: Date.now() }
      setVisits(refreshPayload.data ?? [])
      setAssignOpen(false)
      setAssignVisitId('')
      setAssignMemberId('')
      setAssignReason('Visit assignment updated.')
      toast.success('Visit assignment updated.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update visit assignment'
      setAssignError(message)
      toast.error(message)
    } finally {
      setAssignSaving(false)
    }
  }

  const openSupportDialog = async (visit: VisitRecord) => {
    setSupportDialogVisitId(visit.id)
    setSupportDialogOpen(true)
    setSupportDialogSelection('')
    setSupportDialogError(null)
    setSupportDialogLoading(true)
    try {
      const response = await fetch(`/api/visit-schedule/${visit.id}/supports`, {
        cache: 'no-store',
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load support members')
      }
      const members = Array.isArray(payload?.data?.availableMembers) ? payload.data.availableMembers : []
      setSupportDialogMembers(members)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load support members'
      setSupportDialogError(message)
      setSupportDialogMembers([])
    } finally {
      setSupportDialogLoading(false)
    }
  }

  const openEditDialog = (visit: VisitRecord) => {
    setEditVisitId(visit.id)
    setEditScheduledAt(formatDateTimeLocal(visit.scheduledAt))
    setEditLocation(getVisitAddress(visit) === 'N/A' ? '' : getVisitAddress(visit))
    setEditVisitFee(visit.visitFee !== null && visit.visitFee !== undefined ? String(visit.visitFee) : '')
    setEditProjectSqft(visit.projectSqft !== null && visit.projectSqft !== undefined ? String(visit.projectSqft) : '')
    setEditProjectStatus(visit.projectStatus ?? '')
    setEditNotes(visit.notes ?? '')
    setEditError(null)
    setEditOpen(true)
  }

  const submitEditVisit = async () => {
    if (!editVisitId) return
    if (!editScheduledAt) {
      setEditError('Scheduled date & time is required.')
      return
    }
    if (!editLocation.trim()) {
      setEditError('Address is required.')
      return
    }

    setEditSaving(true)
    setEditError(null)
    try {
      const response = await fetch(`/api/visit-schedule/${editVisitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledAt: new Date(editScheduledAt).toISOString(),
          location: editLocation.trim(),
          visitFee: editVisitFee === '' ? undefined : Number(editVisitFee),
          projectSqft: editProjectSqft === '' ? undefined : Number(editProjectSqft),
          projectStatus: editProjectStatus || undefined,
          notes: editNotes,
          reason: 'Admin edited visit data.',
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to update visit data')
      }

      visitsCacheByScope = {}
      const refreshResponse = await fetch(getVisitScheduleListUrl(visitScope), { cache: 'no-store' })
      const refreshPayload = (await refreshResponse.json()) as ApiResponse
      if (!refreshResponse.ok || !refreshPayload.success) {
        throw new Error(refreshPayload?.error || 'Failed to refresh visits')
      }
      visitsCacheByScope[visitScope] = { data: refreshPayload.data ?? [], savedAt: Date.now() }
      setVisits(refreshPayload.data ?? [])
      setEditOpen(false)
      setEditVisitId('')
      toast.success('Visit data updated.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update visit data'
      setEditError(message)
      toast.error(message)
    } finally {
      setEditSaving(false)
    }
  }

  const submitAddSupportMember = async () => {
    if (!supportDialogVisitId || !supportDialogSelection) {
      setSupportDialogError('Please select a support member.')
      return
    }

    setSupportDialogSaving(true)
    setSupportDialogError(null)
    try {
      const response = await fetch(`/api/visit-schedule/${supportDialogVisitId}/supports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supportUserId: supportDialogSelection }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to add support member')
      }

      const selectedMember = supportDialogMembers.find((member) => member.id === supportDialogSelection) ?? null
      setVisits((prev) =>
        prev.map((visit) => {
          if (visit.id !== supportDialogVisitId || !selectedMember) return visit
          const existing = visit.supportAssignments ?? []
          if (existing.some((item) => item.supportUserId === selectedMember.id)) return visit
          return {
            ...visit,
            supportAssignments: [
              ...existing,
              {
                id: payload?.data?.id ?? `temp-${selectedMember.id}`,
                supportUserId: selectedMember.id,
                supportUser: {
                  id: selectedMember.id,
                  fullName: selectedMember.fullName,
                  email: selectedMember.email,
                },
                result: null,
              },
            ],
          }
        }),
      )

      toast.success('Support member added.')
      setSupportDialogOpen(false)
      setSupportDialogVisitId('')
      setSupportDialogSelection('')
      setSupportDialogMembers([])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add support member'
      setSupportDialogError(message)
      toast.error(message)
    } finally {
      setSupportDialogSaving(false)
    }
  }

  const removeSupportMember = async (visitId: string, supportUserId: string) => {
    try {
      const response = await fetch(
        `/api/visit-schedule/${visitId}/supports?supportUserId=${encodeURIComponent(supportUserId)}`,
        {
          method: 'DELETE',
        },
      )
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to remove support member')
      }

      setVisits((prev) =>
        prev.map((visit) => {
          if (visit.id !== visitId) return visit
          return {
            ...visit,
            supportAssignments: (visit.supportAssignments ?? []).filter(
              (item) => item.supportUserId !== supportUserId,
            ),
          }
        }),
      )
      toast.success('Support member removed.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove support member'
      toast.error(message)
    }
  }

  const submitCompleteVisit = async () => {
    if (!completeVisitId) return
    const currentVisit = visits.find((visit) => visit.id === completeVisitId) ?? null
    const primarySupportPending =
      completeRole === 'LEAD' && supportDataEnabled ? hasPendingPrimarySupportData(currentVisit) : false
    if (primarySupportPending) {
      setCompleteError('Visit cannot be completed yet. The first support member must submit support data first.')
      return
    }
    if (completeRole === 'SUPPORT' && isSupportReadOnly) {
      setCompleteError('Support data workflow is disabled by admin. Support members are read-only.')
      return
    }
    if (completeRole === 'SUPPORT' && currentVisit && !canSubmitSupportData(currentVisit)) {
      setCompleteError('Only the first assigned support member can submit support data for this visit.')
      return
    }
    if (completeRole === 'LEAD' && !completeSummary.trim()) {
      setCompleteError('Summary is required.')
      return
    }
    if (completeRole === 'SUPPORT') {
      if (!supportClientName.trim() || !supportProjectArea.trim() || !supportProjectStatus.trim()) {
        setCompleteError('Client Name, Project Area, and Project Status are required for support.')
        return
      }
    }

    setSubmittingComplete(true)
    setCompleteError(null)
    setUploadingFileNames(completeFiles.map((file) => file.name))
    try {
      const formData = new FormData()
      formData.append('resultType', completeRole)
      if (completeRole === 'LEAD') {
        formData.append('summary', completeSummary.trim())
        if (completeClientMood.trim()) formData.append('clientMood', completeClientMood.trim())
        if (completeNote.trim()) formData.append('note', completeNote.trim())
        if (completeProjectStatus) formData.append('projectStatus', completeProjectStatus)
        if (completeClientPotentiality) formData.append('clientPotentiality', completeClientPotentiality)
        if (completeProjectType) formData.append('projectType', completeProjectType)
        if (completeClientPersonality) formData.append('clientPersonality', completeClientPersonality)
        if (completeBudgetRange.trim()) formData.append('budgetRange', completeBudgetRange.trim())
        if (completeTimelineUrgency) formData.append('timelineUrgency', completeTimelineUrgency)
        if (completeStylePreference) formData.append('stylePreference', completeStylePreference)
      } else {
        formData.append('supportClientName', supportClientName.trim())
        formData.append('supportProjectArea', supportProjectArea.trim())
        formData.append('supportProjectStatus', supportProjectStatus.trim())
        if (supportExtraConcern.trim()) formData.append('supportExtraConcern', supportExtraConcern.trim())
      }
      completeFiles.forEach((file) => {
        formData.append('files', file)
      })

      const res = await fetch(`/api/visit-schedule/${completeVisitId}/result`, {
        method: 'POST',
        body: formData,
      })

      const payload = (await res.json()) as SubmitVisitResultResponse
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to complete visit')
      }
      visitsCacheByScope = {}
      setCompleteOpen(false)
      setCompleteVisitId('')
      setCompleteSummary('')
      setCompleteClientMood('')
      setCompleteNote('')
      setCompleteProjectStatus('')
      setCompleteFiles([])
      setUploadingFileNames([])
      toast.success(completeRole === 'SUPPORT' ? 'Support data submitted.' : 'Visit marked as completed.')

      setLoading(true)
      const response = await fetch(getVisitScheduleListUrl(visitScope))
      const freshPayload = (await response.json()) as ApiResponse
      if (!response.ok || !freshPayload.success) {
        throw new Error(freshPayload?.error || 'Failed to refresh visits')
      }
      visitsCacheByScope[visitScope] = { data: freshPayload.data ?? [], savedAt: Date.now() }
      setVisits(freshPayload.data ?? [])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to complete visit'
      setCompleteError(message)
      toast.error(message)
    } finally {
      setUploadingFileNames([])
      setSubmittingComplete(false)
      setLoading(false)
    }
  }

  const VisitCard = ({ visit }: { visit: VisitRecord }) => {
    const isVisible = canViewVisit(visit)
    const leadHref = `${leadHrefPrefix}/${visit.lead.id}`
    const visitRole = getVisitRole(visit)
    const teamMembers = getVisitTeamMembers(visit)
    const seniorCrmName = getSeniorCrmAssignment(visit)?.user?.fullName || 'Unassigned'
    const supportAssignments = visit.supportAssignments ?? []
    const supportAlreadySubmitted = visitRole === 'SUPPORT' && hasSupportDataSubmitted(visit)
    const canSubmitSupportForVisit = visitRole === 'SUPPORT' && canSubmitSupportData(visit)
    const supportSubmitDisabledReason =
      visitRole === 'SUPPORT'
        ? isSupportReadOnly
          ? 'Support data workflow is disabled by admin. Support members are read-only.'
          : supportAlreadySubmitted
          ? 'Support data already submitted for this visit.'
          : !canSubmitSupportForVisit
            ? 'Only the first assigned support member can submit support data.'
            : undefined
        : undefined
    const canRequestUpdate = canRequestVisitUpdate(visit)
    const updateDisabledReason =
      visit.status === 'COMPLETED' || visit.status === 'CANCELLED'
        ? 'Reschedule and cancel are disabled after visit completion/cancellation.'
        : 'Only assigned visit lead, JR CRM, Admin, or Visit Team Leader can reschedule/cancel.'
    const canNavigateFromCard = cardNavigatesToLead && isVisible

    const handleCardNavigation = (event: MouseEvent<HTMLDivElement>) => {
      if (!canNavigateFromCard || shouldIgnoreCardNavigation(event.target)) return
      router.push(leadHref)
    }

    return (
      <Card
        className={cn(
          'group relative mb-3 overflow-hidden border-border/80 bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg',
          canNavigateFromCard ? 'cursor-pointer' : '',
        )}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-sky-500 to-emerald-500" />
        {!isVisible ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/75 px-4 text-center text-sm font-semibold text-muted-foreground backdrop-blur-[1px]">
            {restrictedMessage}
          </div>
        ) : null}
        <CardContent
          className={cn('space-y-4 p-4 pt-5 sm:p-5 sm:pt-6', !isVisible ? 'blur-xs pointer-events-none select-none' : '')}
          onClick={handleCardNavigation}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h3 className="truncate text-lg font-semibold text-foreground">{visit.lead?.name || 'Unknown Lead'}</h3>
              <p className="text-xs text-muted-foreground">{visit.lead?.phone || 'No phone available'}</p>
            </div>
            <span className={cn('inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide shadow-sm', statusColors[visit.status] ?? 'bg-muted text-foreground')}>
              {formatVisitStatus(visit.status)}
            </span>
          </div>

          <div className="grid gap-2 rounded-xl border border-border/70 bg-muted/25 p-3 text-sm">
            <div className="flex items-center gap-2 text-foreground">
              <Clock className="size-4 shrink-0 text-primary" />
              <span className="font-medium">
                {new Date(visit.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(visit.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="line-clamp-2">{getVisitAddress(visit)}</span>
            </div>
          </div>

          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-lg border border-border/60 bg-background/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">SR CRM</p>
              <p className="mt-1 font-medium text-foreground">{seniorCrmName}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Visit Fee</p>
              <p className="mt-1 font-medium text-foreground">Tk {visit.visitFee ?? 0}</p>
            </div>
            {visit.projectSqft ? <div className="rounded-lg border border-border/60 bg-background/60 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Sqft</p><p className="mt-1 font-medium text-foreground">{visit.projectSqft}</p></div> : null}
            {visit.projectStatus ? <div className="rounded-lg border border-border/60 bg-background/60 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Project Status</p><p className="mt-1 font-medium text-foreground">{visit.projectStatus.replace(/_/g, ' ')}</p></div> : null}
          </div>

          {visit.notes ? <p className="rounded-lg border border-dashed border-border bg-muted/20 p-3 text-sm italic text-muted-foreground">{visit.notes}</p> : null}

          <div className="space-y-2 rounded-xl border border-border/70 bg-background/70 p-3">
            <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold text-foreground">Visit Team</p>{visitRole !== 'NONE' ? <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold', visitRole === 'LEAD' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200')}>{visitRole === 'LEAD' ? 'Leading' : 'Supporting'}</span> : null}</div>
            <div className="flex flex-wrap gap-2">
              {teamMembers.length > 0 ? teamMembers.map((member) => <span key={`${member.role}-${member.id}`} className={cn('rounded-full border px-2.5 py-1 text-xs', member.role === 'LEAD' ? 'border-blue-200 bg-blue-50 font-semibold text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200' : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200')}>{member.role === 'LEAD' ? 'Lead: ' : 'Support: '}{member.name}</span>) : <span className="text-sm text-muted-foreground">Unassigned</span>}
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold text-foreground">Support Members</p>{canManageSupportForVisit(visit) ? <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => void openSupportDialog(visit)}>Manage</Button> : null}</div>
            {supportAssignments.length > 0 ? <div className="space-y-1.5">{supportAssignments.map((item) => <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-background/70 px-2.5 py-2 text-sm"><span className="truncate text-muted-foreground">{item.supportUser.fullName}</span>{canManageSupportForVisit(visit) ? <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={() => void removeSupportMember(visit.id, item.supportUserId)}>Remove</Button> : null}</div>)}</div> : <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><p className="font-semibold">Warning: no support members assigned.</p></div>}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border/70 pt-3">
            {!cardNavigatesToLead ? <Button size="sm" variant="outline" className="flex-1 sm:flex-none" asChild><Link href={leadHref}>Open Lead Details</Link></Button> : null}
            {isAdminActor ? <Button size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={() => openEditDialog(visit)}>Edit Visit</Button> : null}
            {allowManageAssignment || isAdminActor ? <Button size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={() => openAssignDialog(visit)}>{visit.assignedTo ? 'Reassign' : 'Assign'}</Button> : null}
            <Button size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={() => openRequestDialog(visit, 'RESCHEDULE')} disabled={!canRequestUpdate} title={!canRequestUpdate ? updateDisabledReason : undefined}>Reschedule</Button>
            <Button size="sm" variant="outline" className="flex-1 text-destructive hover:text-destructive sm:flex-none" onClick={() => openRequestDialog(visit, 'CANCEL')} disabled={!canRequestUpdate} title={!canRequestUpdate ? updateDisabledReason : undefined}>Cancel</Button>
            {allowCompleteVisit && visitRole !== 'NONE' ? <Button size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={() => openCompleteDialog(visit)} disabled={visitRole === 'SUPPORT' ? isSupportReadOnly || supportAlreadySubmitted || !canSubmitSupportForVisit : visit.status === 'COMPLETED'} title={supportSubmitDisabledReason}>{visitRole === 'SUPPORT' ? supportAlreadySubmitted ? 'Support Data Submitted' : 'Submit Support Data' : 'Complete Visit'}</Button> : null}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <CrmPageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
      />
      <main className="mx-auto w-full max-w-[1440px] overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6 space-y-5 sm:space-y-6">
        {showScheduleButton ? (
          <div className="flex items-center justify-end">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Schedule Visit
            </Button>
          </div>
        ) : null}

        {(showSummaryDashboard || visitTeamView) && activeTab === 'list' ? (
          <div className="space-y-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">{visitTeamView ? 'My visits' : 'Monthly visits'}</p>
                <h2 className="text-xl font-semibold text-foreground">{visitTeamView ? 'Visit summary' : `${monthYear} performance`}</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {visitTeamView ? 'Stats update from your filtered visit cards.' : 'Stats are based on the active calendar month.'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {[
                {
                  label: 'All Visits',
                  value: monthlyVisibleVisits.length,
                  filter: 'ALL' as const,
                  Icon: ClipboardList,
                  accent: 'from-slate-900 to-slate-700 text-white',
                  glow: 'bg-slate-500/15',
                },
                {
                  label: 'Pending',
                  value: monthlyScheduledVisits.length,
                  filter: 'SCHEDULED' as const,
                  Icon: CalendarDays,
                  accent: 'from-sky-500 to-blue-600 text-white',
                  glow: 'bg-sky-500/15',
                },
                {
                  label: 'Completed',
                  value: monthlyCompletedVisits.length,
                  filter: 'COMPLETED' as const,
                  Icon: CheckCheck,
                  accent: 'from-emerald-500 to-green-600 text-white',
                  glow: 'bg-emerald-500/15',
                },
                {
                  label: 'Rescheduled',
                  value: monthlyRescheduledVisits.length,
                  filter: 'RESCHEDULED' as const,
                  Icon: RotateCcw,
                  accent: 'from-amber-400 to-orange-500 text-white',
                  glow: 'bg-amber-500/15',
                },
                {
                  label: 'Cancelled',
                  value: monthlyCancelledVisits.length,
                  filter: 'CANCELLED' as const,
                  Icon: Ban,
                  accent: 'from-rose-500 to-red-600 text-white',
                  glow: 'bg-rose-500/15',
                },
                {
                  label: 'Leading',
                  value: monthlyLeadRoleVisits.length,
                  filter: 'LEAD' as const,
                  Icon: UserCheck,
                  accent: 'from-indigo-500 to-violet-600 text-white',
                  glow: 'bg-indigo-500/15',
                },
                {
                  label: 'Supporting',
                  value: monthlySupportRoleVisits.length,
                  filter: 'SUPPORT' as const,
                  Icon: Users,
                  accent: 'from-teal-500 to-cyan-600 text-white',
                  glow: 'bg-teal-500/15',
                },
              ].map(({ label, value, filter, Icon, accent, glow }) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => openListDetails(filter)}
                  className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl"
                >
                  <span className={`absolute -right-8 -top-8 size-24 rounded-full blur-2xl ${glow}`} />
                  <span className={`relative inline-flex size-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg ${accent}`}>
                    <Icon className="size-5" />
                  </span>
                  <p className="relative mt-4 text-sm font-medium text-muted-foreground">{label}</p>
                  <p className="relative mt-1 text-3xl font-bold tracking-tight text-foreground">{value}</p>
                </button>
              ))}
            </div>
          </div>
        ) : null}

      {loading ? <p className="text-sm text-muted-foreground">Loading visits...</p> : null}
      {!loading && error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(visitTeamView ? 'list' : value)}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {!visitTeamView ? (
          <TabsList className="grid w-full grid-cols-2 rounded-lg bg-muted p-1 md:hidden">
            <TabsTrigger value="calendar" className="text-sm">Calendar View</TabsTrigger>
            <TabsTrigger value="list" className="text-sm">List View</TabsTrigger>
          </TabsList>
          ) : null}
          {!visitTeamView ? (
          <div className="hidden md:flex items-center gap-2 rounded-lg border border-border bg-card p-1">
            <Button
              type="button"
              size="sm"
              variant={activeTab === 'calendar' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('calendar')}
            >
              Calendar View
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeTab === 'list' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('list')}
            >
              List View
            </Button>
          </div>
          ) : null}
          {!visitTeamView ? (
          <div className="w-full md:w-72">
            <Label htmlFor="sr-crm-filter" className="sr-only">SR CRM Filter</Label>
            <Select value={srCrmFilter} onValueChange={setSrCrmFilter}>
              <SelectTrigger id="sr-crm-filter" className="bg-card">
                <SelectValue placeholder="Filter by SR CRM" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All SR CRM</SelectItem>
                <SelectItem value="UNASSIGNED">Unassigned SR CRM</SelectItem>
                {srCrmOptions.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          ) : null}
        </div>

        <TabsContent value="calendar" className="mt-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{monthYear}</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrevMonth}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleNextMonth}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="hidden sm:grid grid-cols-7 gap-2">
                    {calendarWeekLabels.map((day) => (
                      <div key={day} className="text-center font-semibold text-muted-foreground text-sm py-2">
                        {day}
                      </div>
                    ))}
                    {loading
                      ? Array.from({ length: 35 }).map((_, idx) => (
                          <div key={idx} className="aspect-square rounded-lg border bg-muted/60 animate-pulse" />
                        ))
                      : calendarDays.map((day, idx) => {
                          const visitsForDay = day ? getVisitsForDay(day) : []
                          const dateStr = day ? getDateString(day) : null
                          const isSelected = selectedDate === dateStr

                          const leadCount = visitsForDay.filter((visit) => getVisitRole(visit) === 'LEAD').length
                          const supportCount = visitsForDay.filter((visit) => getVisitRole(visit) === 'SUPPORT').length
                          return (
                            <div
                              key={idx}
                              onClick={() => day && setSelectedDate(dateStr)}
                              className={`aspect-square p-2 border rounded-lg text-center cursor-pointer transition-colors ${
                                !day
                                  ? 'bg-muted'
                                  : isSelected
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : visitsForDay.length > 0
                                      ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:border-blue-400'
                                      : 'hover:border-gray-400'
                              }`}
                            >
                              {day && (
                                <div className="flex flex-col items-center justify-center h-full">
                                  <span className="font-semibold text-sm">{day}</span>
                                  {visitsForDay.length > 0 && (
                                    <div className="mt-1 flex items-center gap-1">
                                      <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 text-[10px] font-bold text-white bg-slate-700 rounded-full">
                                        {visitsForDay.length}
                                      </span>
                                      {leadCount > 0 ? (
                                        <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 text-[10px] font-bold text-white bg-blue-500 rounded-full">
                                          {leadCount}
                                        </span>
                                      ) : null}
                                      {supportCount > 0 ? (
                                        <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 text-[10px] font-bold text-white bg-emerald-500 rounded-full">
                                          {supportCount}
                                        </span>
                                      ) : null}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                  </div>

                  <div className="space-y-2 sm:hidden">
                    {loading
                      ? Array.from({ length: 6 }).map((_, idx) => (
                          <div key={idx} className="h-20 rounded-lg border bg-muted/60 animate-pulse" />
                        ))
                      : mobileCalendarRows.map((row) => {
                          const isSelected = selectedDate === row.dateString
                          const leadCount = row.visits.filter((visit) => getVisitRole(visit) === 'LEAD').length
                          const supportCount = row.visits.filter((visit) => getVisitRole(visit) === 'SUPPORT').length
                          return (
                            <div
                              key={row.dateString}
                              className={`w-full rounded-lg border p-3 transition ${
                                isSelected
                                  ? 'border-primary bg-primary/5'
                                  : row.visits.length > 0
                                    ? 'border-blue-300 bg-blue-50/70 dark:bg-blue-900/20'
                                    : 'border-border bg-card'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => setSelectedDate(row.dateString)}
                                className="w-full text-left"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm text-muted-foreground">{row.dayLabel}</p>
                                    <p className="text-base font-semibold text-foreground">
                                      {monthYear.split(' ')[0]} {row.day}
                                    </p>
                                  </div>
                                  <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-primary/10 px-2 py-1 text-sm font-semibold text-primary">
                                    {row.visits.length}
                                  </span>
                                </div>
                                <div className="mt-1 flex items-center gap-1 text-xs">
                                  <span className="rounded-full bg-blue-100 px-2 py-0.5 font-semibold text-blue-700">Lead {leadCount}</span>
                                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">Support {supportCount}</span>
                                </div>
                              </button>

                              {row.visits.length > 0 ? (
                                <div className="mt-2 space-y-2">
                                  {row.visits.slice(0, 3).map((visit) => {
                                    const isVisible = canViewVisit(visit)
                                    const role = getVisitRole(visit)
                                    const leadHref = `${leadHrefPrefix}/${visit.lead.id}`
                                    const canNavigateFromCard = cardNavigatesToLead && isVisible
                                    return (
                                      <div
                                        key={visit.id}
                                        className={cn(
                                          'rounded-md border border-border bg-card p-2 text-sm relative overflow-hidden',
                                          canNavigateFromCard ? 'cursor-pointer transition hover:border-primary/40' : '',
                                        )}
                                        onClick={(event) => {
                                          if (!canNavigateFromCard || shouldIgnoreCardNavigation(event.target)) return
                                          router.push(leadHref)
                                        }}
                                      >
                                        {!isVisible ? (
                                          <div className="absolute inset-0 z-10 flex items-center justify-center text-xs font-semibold text-muted-foreground bg-background/70">
                                            {restrictedMessage}
                                          </div>
                                        ) : null}
                                        <div className={`space-y-1 ${!isVisible ? 'blur-xs pointer-events-none select-none' : ''}`}>
                                          <p className="font-semibold text-foreground">{visit.lead?.name || 'Unknown Lead'}</p>
                                          <p className="text-muted-foreground">
                                            {new Date(visit.scheduledAt).toLocaleTimeString('en-US', {
                                              hour: '2-digit',
                                              minute: '2-digit',
                                            })}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            Address: {getVisitAddress(visit)}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            SR CRM: {getSeniorCrmAssignment(visit)?.user?.fullName || 'Unassigned'}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            Team:{' '}
                                            {getVisitTeamMembers(visit).length > 0
                                              ? getVisitTeamMembers(visit).map((member, index) => (
                                                  <span key={`${member.role}-${member.id}`}>
                                                    {index > 0 ? ', ' : ''}
                                                    <span className={member.role === 'LEAD' ? 'font-bold text-foreground' : ''}>
                                                      {member.name}
                                                    </span>
                                                  </span>
                                                ))
                                              : 'None'}
                                          </p>
                                          {!cardNavigatesToLead ? (
                                            <div>
                                              <Button size="sm" variant="outline" asChild className="h-7 px-2 text-xs">
                                                <Link href={leadHref}>Open Lead</Link>
                                              </Button>
                                            </div>
                                          ) : null}
                                          {role !== 'NONE' ? (
                                            <p className="text-xs font-semibold text-muted-foreground">
                                              {role === 'LEAD' ? 'Leading' : 'Supporting'}
                                            </p>
                                          ) : null}
                                        </div>
                                      </div>
                                    )
                                  })}
                                  {row.visits.length > 3 ? (
                                    <p className="text-xs text-muted-foreground font-medium">
                                      +{row.visits.length - 3} more visit(s)
                                    </p>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          )
                        })}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="hidden sm:block">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {selectedDate
                      ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'Select a Day'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, idx) => (
                        <div key={idx} className="rounded-lg border p-3 space-y-2 animate-pulse">
                          <div className="h-4 w-36 rounded bg-muted" />
                          <div className="h-3 w-24 rounded bg-muted" />
                          <div className="h-3 w-full rounded bg-muted" />
                        </div>
                      ))}
                    </div>
                  ) : selectedDate && visitsByDate[selectedDate] ? (
                    <div className="space-y-3">
                      {visitsByDate[selectedDate].map((visit) => {
                        const isVisible = canViewVisit(visit)
                        const role = getVisitRole(visit)
                        const leadHref = `${leadHrefPrefix}/${visit.lead.id}`
                        const canNavigateFromCard = cardNavigatesToLead && isVisible
                        return (
                          <div
                            key={visit.id}
                            className={cn(
                              'p-3 border rounded-lg space-y-2 bg-muted/50 relative overflow-hidden',
                              canNavigateFromCard ? 'cursor-pointer transition hover:border-primary/40' : '',
                            )}
                            onClick={(event) => {
                              if (!canNavigateFromCard || shouldIgnoreCardNavigation(event.target)) return
                              router.push(leadHref)
                            }}
                          >
                            {!isVisible ? (
                              <div className="absolute inset-0 z-10 flex items-center justify-center text-[10px] font-semibold text-muted-foreground bg-background/70">
                                {restrictedMessage}
                              </div>
                            ) : null}
                            <div className={!isVisible ? 'blur-xs pointer-events-none select-none' : ''}>
                              <div>
                                <h4 className="font-semibold text-sm">{visit.lead?.name || 'Unknown'}</h4>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {new Date(visit.scheduledAt).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <MapPin className="w-3 h-3" />
                                <span className="line-clamp-2">{getVisitAddress(visit)}</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                SR CRM: {getSeniorCrmAssignment(visit)?.user?.fullName || 'Unassigned'}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                Team:{' '}
                                {getVisitTeamMembers(visit).length > 0
                                  ? getVisitTeamMembers(visit).map((member, index) => (
                                      <span key={`${member.role}-${member.id}`}>
                                        {index > 0 ? ', ' : ''}
                                        <span className={member.role === 'LEAD' ? 'font-bold text-foreground' : ''}>
                                          {member.name}
                                        </span>
                                      </span>
                                    ))
                                  : 'None'}
                              </p>
                              <span
                                className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                  statusColors[visit.status]
                                }`}
                              >
                                {formatVisitStatus(visit.status)}
                              </span>
                              {role !== 'NONE' ? (
                                <span
                                  className={`ml-2 inline-block px-2 py-1 rounded text-[10px] font-semibold ${
                                    role === 'LEAD'
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
                                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                                  }`}
                                >
                                  {role === 'LEAD' ? 'Leading' : 'Supporting'}
                                </span>
                              ) : null}
                              {!cardNavigatesToLead ? (
                                <div className="pt-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    asChild
                                    className="h-7 px-2 text-[11px]"
                                  >
                                    <Link href={leadHref}>Open Lead</Link>
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {selectedDate ? 'No visits scheduled' : 'Click on a day to see visits'}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <div className="space-y-6" ref={listDetailsRef}>
            <div className={visitTeamView ? 'grid gap-3' : 'grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.5fr_auto]'}>
              <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                <div className="grid gap-4">
                  <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                    <div className="space-y-1">
                      <Label htmlFor="list-search">Search</Label>
                      <Input
                        id="list-search"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search by lead name or phone"
                        className="w-full"
                      />
                    </div>
                    <div className="flex items-end justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!searchTerm}
                        onClick={() => setSearchTerm('')}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                  <div className={visitTeamView ? 'grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end' : 'grid gap-3 sm:grid-cols-3 xl:grid-cols-4'}>
                    <div className="space-y-1">
                      <Label htmlFor="list-date-range">Date Range</Label>
                      <DateRangePicker
                        id="list-date-range"
                        value={listDateRange}
                        onChange={(range) => {
                          setListDateRange(range)
                          if (!range) {
                            setListDateFrom('')
                            setListDateTo('')
                            return
                          }
                          setListDateFrom(range.from ? format(range.from, 'yyyy-MM-dd') : '')
                          setListDateTo(range.to ? format(range.to, 'yyyy-MM-dd') : '')
                        }}
                        placeholder="From - To"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="list-sr-crm-filter">SR CRM</Label>
                      <Select value={srCrmFilter} onValueChange={setSrCrmFilter}>
                        <SelectTrigger id="list-sr-crm-filter">
                          <SelectValue placeholder="All SR CRM" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All SR CRM</SelectItem>
                          <SelectItem value="UNASSIGNED">Unassigned SR CRM</SelectItem>
                          {srCrmOptions.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {visitTeamView ? (
                      <div className="flex justify-end md:items-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchTerm('')
                            setListDateFrom('')
                            setListDateTo('')
                            setListDateRange(undefined)
                            setSrCrmFilter('ALL')
                          }}
                        >
                          Reset Filters
                        </Button>
                      </div>
                    ) : (visitScope as string) === 'visit' ? (
                      <div className="space-y-1" />
                    ) : (
                      <div className="space-y-1">
                        <Label htmlFor="list-member-filter">Visit Team Member</Label>
                        <Select value={listMemberFilter} onValueChange={setListMemberFilter}>
                          <SelectTrigger id="list-member-filter">
                            <SelectValue placeholder="All members" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">All members</SelectItem>
                            {listMemberOptions.map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.fullName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  {!visitTeamView ? (
                    <div className="flex justify-end md:items-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setListDateFrom('')
                          setListDateTo('')
                          setListDateRange(undefined)
                          setListMemberFilter('ALL')
                          setSrCrmFilter('ALL')
                        }}
                      >
                        Reset Filters
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>

              {!visitTeamView ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                  <p className="text-sm font-medium text-muted-foreground">Current filter</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{listFilterLabel}</p>
                  <p className="text-sm text-muted-foreground">{filteredListVisits.length} visit(s)</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                  <p className="text-sm font-medium text-muted-foreground">Visible team members</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{listMemberOptions.length || 'All'}</p>
                  <p className="text-sm text-muted-foreground">Currently filtered members</p>
                </div>
              </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              {!visitTeamView ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    Status <span className="text-muted-foreground">▾</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1">
                  {[
                    ['ALL', 'All'],
                    ['COMPLETED', 'Completed'],
                    ['RESCHEDULED', 'Rescheduled'],
                    ['CANCELLED', 'Cancelled'],
                  ].map(([value, label]) => (
                    <Button
                      key={value}
                      type="button"
                      size="sm"
                      variant={listFilter === value ? 'secondary' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() =>
                        setListFilter(
                          value as
                            | 'ALL'
                            | 'SCHEDULED'
                            | 'COMPLETED'
                            | 'RESCHEDULED'
                            | 'CANCELLED'
                            | 'LEAD'
                            | 'SUPPORT',
                        )
                      }
                    >
                      {label}
                    </Button>
                  ))}
                </PopoverContent>
              </Popover>
              ) : null}
              {!visitTeamView ? (
              <Button variant="outline" size="sm" onClick={() => {
                setListFilter('ALL')
                setListDateFrom('')
                setListDateTo('')
                setListDateRange(undefined)
                setSrCrmFilter('ALL')
              }}>
                Reset Filters
              </Button>
              ) : null}
              <p className="text-xs text-muted-foreground">Showing {filteredListVisits.length} visits</p>
              {!visitTeamView ? (
              <div className="hidden md:flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
                <Button
                  type="button"
                  size="sm"
                  variant={listViewMode === 'table' ? 'default' : 'ghost'}
                  onClick={() => setListViewMode('table')}
                >
                  Table View
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={listViewMode === 'card' ? 'default' : 'ghost'}
                  onClick={() => setListViewMode('card')}
                >
                  Card View
                </Button>
              </div>
              ) : null}
            </div>

            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-border bg-muted px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{listFilterLabel}</p>
                  <p className="text-xs text-muted-foreground">Showing {filteredListVisits.length} visits</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setListFilter('ALL')}>
                  Show all
                </Button>
              </div>
              {!visitTeamView && listViewMode === 'table' ? (
                <Table className="min-w-[1000px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Assigned Team</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 6 }).map((_, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="h-12 bg-muted/50" />
                          <TableCell className="h-12 bg-muted/50" />
                          <TableCell className="h-12 bg-muted/50" />
                          <TableCell className="h-12 bg-muted/50" />
                          <TableCell className="h-12 bg-muted/50" />
                          <TableCell className="h-12 bg-muted/50" />
                          <TableCell className="h-12 bg-muted/50" />
                        </TableRow>
                      ))
                    ) : filteredListVisits.length > 0 ? (
                      filteredListVisits.map((visit) => {
                        const leadHref = `${leadHrefPrefix}/${visit.lead.id}`
                        const role = getVisitRole(visit)
                        const teamMembers = getVisitTeamMembers(visit)
                        const srCrmName = getSeniorCrmAssignment(visit)?.user?.fullName || 'Unassigned'
                        return (
                          <TableRow key={visit.id}>
                            <TableCell className="max-w-[220px]">
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground truncate">{visit.lead?.name || 'Unknown Lead'}</p>
                                <p className="text-xs text-muted-foreground truncate">{visit.lead?.phone || 'No phone'}</p>
                                <p className="text-xs text-muted-foreground truncate">SR CRM: {srCrmName}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium text-foreground">
                                  {new Date(visit.scheduledAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(visit.scheduledAt).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[220px]">
                              <div className="min-w-0">
                                <p className="truncate">{getVisitAddress(visit)}</p>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[240px]">
                              <div className="space-y-1 text-sm">
                                {teamMembers.length > 0 ? (
                                  teamMembers.map((member) => (
                                    <p
                                      key={`${member.role}-${member.id}`}
                                      className={cn(
                                        'truncate',
                                        member.role === 'LEAD'
                                          ? 'font-bold text-foreground'
                                          : 'text-xs text-muted-foreground',
                                      )}
                                    >
                                      {member.role === 'LEAD' ? 'Lead: ' : 'Support: '}
                                      {member.name}
                                    </p>
                                  ))
                                ) : (
                                  <p className="text-muted-foreground">Unassigned</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${
                                  statusColors[visit.status] ?? 'bg-muted text-foreground'
                                }`}
                              >
                                {formatVisitStatus(visit.status)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-medium text-foreground capitalize">
                                {role === 'LEAD' ? 'Leading' : role === 'SUPPORT' ? 'Supporting' : 'None'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {isAdminActor ? (
                                  <Button size="sm" variant="outline" onClick={() => openEditDialog(visit)}>
                                    Edit Visit
                                  </Button>
                                ) : null}
                                <Button size="sm" variant="outline" asChild>
                                  <Link href={leadHref}>View</Link>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="p-4 text-center text-sm text-muted-foreground">
                          No visits found for this filter.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {loading ? (
                    Array.from({ length: 6 }).map((_, idx) => (
                      <Card key={idx} className="border-border animate-pulse">
                        <CardContent className="h-44" />
                      </Card>
                    ))
                  ) : filteredListVisits.length > 0 ? (
                    filteredListVisits.map((visit) => (
                      <VisitCard key={visit.id} visit={visit} />
                    ))
                  ) : (
                    <p className="col-span-full text-center text-sm text-muted-foreground py-8">
                      No visits found for this filter.
                    </p>
                  )}
                </div>
              )}
            </div>

            {!showSummaryDashboard ? (
              <div>
                <h3 className="mb-3 font-semibold text-foreground">Completed ({completedVisits.length})</h3>
                {loading ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <Card key={idx} className="border-border animate-pulse">
                        <CardContent className="h-44" />
                      </Card>
                    ))}
                  </div>
                ) : completedVisits.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {completedVisits.map((visit) => (
                      <VisitCard key={visit.id} visit={visit} />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No completed visits</p>
                )}
              </div>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog
        open={requestOpen}
        onOpenChange={(open) => {
          setRequestOpen(open)
          if (!open) {
            setRequestVisitId('')
            setRequestType('RESCHEDULE')
            setRequestReason('')
            setRequestScheduleAt('')
            setRequestError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{requestType === 'RESCHEDULE' ? 'Reschedule Visit' : 'Cancel Visit'}</DialogTitle>
            <DialogDescription>
              {requestType === 'RESCHEDULE'
                ? 'Update the visit schedule with a reason.'
                : 'Cancel this visit with a reason.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {requestType === 'RESCHEDULE' ? (
              <div className="space-y-2">
                <Label>Rescheduled Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={requestScheduleAt}
                  onChange={(event) => setRequestScheduleAt(event.target.value)}
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                rows={3}
                value={requestReason}
                onChange={(event) => setRequestReason(event.target.value)}
                placeholder="Add reason..."
              />
            </div>
            {requestError ? <p className="text-sm text-destructive">{requestError}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestOpen(false)}>
              Close
            </Button>
            <Button onClick={submitVisitUpdateRequest} disabled={requestSaving}>
              {requestSaving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : requestType === 'RESCHEDULE' ? (
                'Save Reschedule'
              ) : (
                'Confirm Cancel'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) {
            setEditVisitId('')
            setEditError(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Visit Data</DialogTitle>
            <DialogDescription>
              Admin-only edit form for visit schedule, address, fee, project data, and notes.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Scheduled Date & Time</Label>
              <Input
                type="datetime-local"
                value={editScheduledAt}
                onChange={(event) => setEditScheduledAt(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Visit Fee</Label>
              <Input
                type="number"
                min="0"
                value={editVisitFee}
                onChange={(event) => setEditVisitFee(event.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Address</Label>
              <Input
                value={editLocation}
                onChange={(event) => setEditLocation(event.target.value)}
                placeholder="Visit address"
              />
            </div>
            <div className="space-y-2">
              <Label>Project Sqft</Label>
              <Input
                type="number"
                min="1"
                value={editProjectSqft}
                onChange={(event) => setEditProjectSqft(event.target.value)}
                placeholder="Project sqft"
              />
            </div>
            <div className="space-y-2">
              <Label>Project Status</Label>
              <select
                value={editProjectStatus}
                onChange={(event) => setEditProjectStatus(event.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select project status</option>
                {projectStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={editNotes}
                onChange={(event) => setEditNotes(event.target.value)}
                placeholder="Visit notes"
              />
            </div>
            {editError ? <p className="text-sm text-destructive sm:col-span-2">{editError}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Close
            </Button>
            <Button onClick={submitEditVisit} disabled={editSaving}>
              {editSaving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Update Visit'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col rounded-none p-0 sm:top-[50%] sm:left-[50%] sm:h-auto sm:w-full sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:p-6">
          <DialogHeader className="border-b px-4 py-3 sm:border-0 sm:px-0 sm:py-0">
            <DialogTitle>Complete Visit</DialogTitle>
            <DialogDescription>
              {completeRole === 'SUPPORT'
                ? 'Submit project details as support member.'
                : 'Submit visit outcome to mark this visit as completed and update lead stage automatically.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-0 sm:py-4">
            {completeRole === 'LEAD' &&
            completeVisitId &&
            supportDataEnabled &&
            hasPendingPrimarySupportData(visits.find((visit) => visit.id === completeVisitId) ?? null) ? (
              <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                This visit cannot be completed yet. The first support member must submit support data first.
              </div>
            ) : null}
            {completeRole === 'SUPPORT' ? (
              <>
                <div className="space-y-2">
                  <Label>Client Name</Label>
                  <Input value={supportClientName} onChange={(e) => setSupportClientName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Project Area</Label>
                  <Input value={supportProjectArea} onChange={(e) => setSupportProjectArea(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Project Status</Label>
                  <select
                    value={supportProjectStatus}
                    onChange={(event) => setSupportProjectStatus(event.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Select project status</option>
                    {projectStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Extra Concern (optional)</Label>
                  <Textarea value={supportExtraConcern} onChange={(e) => setSupportExtraConcern(e.target.value)} rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>Attachments (optional)</Label>
                  <Input
                    type="file"
                    multiple
                    onChange={(event) => {
                      setCompleteFiles(Array.from(event.target.files ?? []))
                      setFailedUploadFiles([])
                    }}
                  />
                  {completeFiles.length > 0 ? (
                    <p className="text-xs text-muted-foreground">{completeFiles.length} file(s) selected</p>
                  ) : null}
                  {selectedFilesStatusList}
                </div>
              </>
            ) : (
              <Tabs defaultValue="outcome" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="outcome">Outcome</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="files">Files</TabsTrigger>
                </TabsList>
                <TabsContent value="outcome" className="mt-4 space-y-3">
                  <div className="space-y-2">
                    <Label>Meeting Summary</Label>
                    <Textarea
                      value={completeSummary}
                      onChange={(event) => setCompleteSummary(event.target.value)}
                      rows={3}
                      placeholder="What happened during this visit?"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Client Mood (optional)</Label>
                    <Select
                      value={completeClientMood || selectUnsetValue}
                      onValueChange={(value) =>
                        setCompleteClientMood(value === selectUnsetValue ? '' : value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select client mood" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={selectUnsetValue}>None</SelectItem>
                        {clientMoodOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex flex-col">
                              <span>{option.label}</span>
                              {option.description ? (
                                <span className="text-xs text-muted-foreground">{option.description}</span>
                              ) : null}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Project Status (optional)</Label>
                    <select
                      value={completeProjectStatus}
                      onChange={(event) => setCompleteProjectStatus(event.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Select project status</option>
                      {projectStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Note (optional)</Label>
                    <Textarea
                      value={completeNote}
                      onChange={(event) => setCompleteNote(event.target.value)}
                      rows={2}
                      placeholder="Add follow-up note if needed"
                    />
                  </div>
                </TabsContent>
                <TabsContent value="details" className="mt-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Potentiality / Hotness</Label>
                      <Select
                        value={completeClientPotentiality || selectUnsetValue}
                        onValueChange={(value) =>
                          setCompleteClientPotentiality(value === selectUnsetValue ? '' : value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select potentiality" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={selectUnsetValue}>None</SelectItem>
                          {clientPotentialityOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Project Type</Label>
                      <Select
                        value={completeProjectType || selectUnsetValue}
                        onValueChange={(value) =>
                          setCompleteProjectType(value === selectUnsetValue ? '' : value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select project type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={selectUnsetValue}>None</SelectItem>
                          {projectTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Client Personality</Label>
                      <Select
                        value={completeClientPersonality || selectUnsetValue}
                        onValueChange={(value) =>
                          setCompleteClientPersonality(value === selectUnsetValue ? '' : value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select client personality" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={selectUnsetValue}>None</SelectItem>
                          {clientPersonalityOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex flex-col">
                                <span>{option.label}</span>
                                {option.description ? (
                                  <span className="text-xs text-muted-foreground">{option.description}</span>
                                ) : null}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Budget Range</Label>
                      <Select
                        value={completeBudgetRange || selectUnsetValue}
                        onValueChange={(value) =>
                          setCompleteBudgetRange(value === selectUnsetValue ? '' : value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select budget range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={selectUnsetValue}>None</SelectItem>
                          {budgetRangeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Urgency</Label>
                      <Select
                        value={completeTimelineUrgency || selectUnsetValue}
                        onValueChange={(value) =>
                          setCompleteTimelineUrgency(value === selectUnsetValue ? '' : value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select urgency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={selectUnsetValue}>None</SelectItem>
                          {urgencyOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Style Preference</Label>
                      <Select
                        value={completeStylePreference || selectUnsetValue}
                        onValueChange={(value) =>
                          setCompleteStylePreference(value === selectUnsetValue ? '' : value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select style preference" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={selectUnsetValue}>None</SelectItem>
                          {stylePreferenceOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="files" className="mt-4 space-y-2">
                  <Label>Attachments (optional)</Label>
                  <Input
                    type="file"
                    multiple
                    onChange={(event) => {
                      setCompleteFiles(Array.from(event.target.files ?? []))
                      setFailedUploadFiles([])
                    }}
                  />
                  {completeFiles.length > 0 ? (
                    <p className="text-xs text-muted-foreground">{completeFiles.length} file(s) selected</p>
                  ) : null}
                  {selectedFilesStatusList}
                </TabsContent>
              </Tabs>
            )}
            {completeError ? <p className="text-sm text-destructive">{completeError}</p> : null}
          </div>
          <DialogFooter className="border-t px-4 py-3 sm:border-0 sm:px-0 sm:py-0">
            <Button variant="outline" onClick={() => setCompleteOpen(false)}>
              Close
            </Button>
            <Button
              onClick={submitCompleteVisit}
              disabled={
                submittingComplete ||
                (completeRole === 'LEAD' &&
                  supportDataEnabled &&
                  Boolean(
                    hasPendingPrimarySupportData(
                      visits.find((visit) => visit.id === completeVisitId) ?? null,
                    ),
                  ))
              }
            >
              {submittingComplete ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                completeRole === 'SUPPORT' ? 'Submit Support Data' : 'Complete Visit'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Visit Member</DialogTitle>
            <DialogDescription>
              Assign or reassign this visit to a Visit Team member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Visit Team Member</Label>
              <select
                value={assignMemberId}
                onChange={(event) => setAssignMemberId(event.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                disabled={assignLoadingMembers}
              >
                <option value="">{assignLoadingMembers ? 'Loading members...' : 'Select member'}</option>
                {assignMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.fullName} ({member.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={assignReason}
                onChange={(event) => setAssignReason(event.target.value)}
                rows={3}
              />
            </div>
            {assignError ? <p className="text-sm text-destructive">{assignError}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Close
            </Button>
            <Button onClick={submitAssignVisit} disabled={assignSaving || assignLoadingMembers}>
              {assignSaving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Assignment'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={supportDialogOpen}
        onOpenChange={(open) => {
          setSupportDialogOpen(open)
          if (!open) {
            setSupportDialogVisitId('')
            setSupportDialogSelection('')
            setSupportDialogMembers([])
            setSupportDialogError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Support Member</DialogTitle>
            <DialogDescription>
              Assign a support member for this visit without opening lead details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Support Member</Label>
              <select
                value={supportDialogSelection}
                onChange={(event) => setSupportDialogSelection(event.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                disabled={supportDialogLoading}
              >
                <option value="">
                  {supportDialogLoading
                    ? 'Loading visit team members...'
                    : supportDialogMembers.length === 0
                      ? 'No available members'
                      : 'Select support member'}
                </option>
                {supportDialogMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.fullName} ({member.email})
                  </option>
                ))}
              </select>
            </div>
            {supportDialogError ? <p className="text-sm text-destructive">{supportDialogError}</p> : null}
          </div>
          <DialogFooter>
            <Button
              onClick={submitAddSupportMember}
              disabled={supportDialogSaving || supportDialogLoading || !supportDialogSelection}
            >
              {supportDialogSaving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Add Support Member'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </main>
    </div>
  )
}

export default function VisitsPage() {
  return <VisitsPageView />
}
