'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Ban,
  Calendar,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Coins,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Paperclip,
  Phone,
  Plus,
  Receipt,
  RefreshCw,
  Sparkles,
  User,
  Wallet,
  Wrench,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from '@/components/ui/sonner'
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
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

/* ────────── Types ────────── */
type VisitStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED'
type ProjectStatus = 'UNDER_CONSTRUCTION' | 'READY'

type AttachmentItem = {
  id: string
  fileName: string
  url: string
  fileType: string
}

type VisitResultData = {
  id: string
  summary: string
  projectType: string | null
  budgetRange: string | null
  timelineUrgency: string | null
  stylePreference: string | null
  completedAt: string
  files: AttachmentItem[]
}

type PartialVisitRecord = {
  id: string
  scheduledAt: string
  location: string
  visitType: string
  status: VisitStatus
  notes: string | null
  visitFee?: number | null
  projectSqft?: number | null
  projectStatus?: ProjectStatus | null
  lead: {
    id: string
    name: string
    phone: string
    location: string | null
    budget?: number | null
  }
  assignedTo: {
    id: string
    fullName: string
    email: string
    phone?: string | null
  } | null
  result?: VisitResultData | null
}

type LeadInfo = {
  id: string
  name: string
  phone: string
  email?: string | null
  location?: string | null
  budget?: number | null
  stage?: string | null
  subStatus?: string | null
  source?: string | null
  remarks?: string | null
}

type TokenRecord = {
  id: string
  date: string
  amount: number
  particular: string | null
  reference: string | null
  collectedBy: {
    id: string
    fullName: string
    email: string
  } | null
  financeAccount: {
    id: string
    name: string
    accountNumber: string | null
  } | null
}

type FinanceAccountOption = {
  id: string
  name: string
  type: string
  accountNumber: string | null
}

type SdcUserOption = {
  id: string
  fullName: string
  email: string
}

/* ────────── Helpers ────────── */
function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString('en-BD', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return value
  }
}

function formatCurrency(val?: number | null) {
  if (val == null) return '—'
  return `৳${val.toLocaleString('en-BD')}`
}

function getStatusConfig(status: VisitStatus) {
  switch (status) {
    case 'SCHEDULED':
      return {
        label: 'Scheduled',
        icon: Clock,
        badgeClass:
          'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300',
      }
    case 'COMPLETED':
      return {
        label: 'Completed',
        icon: CheckCircle2,
        badgeClass:
          'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300',
      }
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        icon: Ban,
        badgeClass:
          'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300',
      }
    case 'RESCHEDULED':
      return {
        label: 'Rescheduled',
        icon: Calendar,
        badgeClass:
          'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300',
      }
    default:
      return {
        label: status,
        icon: Clock,
        badgeClass: 'bg-gray-100 text-gray-800 border-gray-200',
      }
  }
}

function stageLabel(stage?: string | null) {
  if (!stage) return '—'
  return stage
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/* ────────── Component ────────── */
export default function PartialVisitLeadDetailPage() {
  const params = useParams<{ leadId: string }>()
  const router = useRouter()
  const leadId = params.leadId

  const [lead, setLead] = useState<LeadInfo | null>(null)
  const [visits, setVisits] = useState<PartialVisitRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Visit Complete Dialog
  const [selectedVisit, setSelectedVisit] = useState<PartialVisitRecord | null>(null)
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [clientName, setClientName] = useState('')
  const [remarks, setRemarks] = useState('')
  const [budget, setBudget] = useState('')
  const [requirements, setRequirements] = useState('')
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>('UNDER_CONSTRUCTION')
  const [nextFollowUp, setNextFollowUp] = useState('')
  const [projectType, setProjectType] = useState<'RESIDENTIAL' | 'COMMERCIAL'>('RESIDENTIAL')
  const [priority, setPriority] = useState<'IMMEDIATE' | '1-2 months' | '2-3 months'>('IMMEDIATE')
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const [submittingComplete, setSubmittingComplete] = useState(false)

  // Reschedule Dialog
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleNotes, setRescheduleNotes] = useState('')
  const [submittingReschedule, setSubmittingReschedule] = useState(false)

  // Cancel Dialog
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [submittingCancel, setSubmittingCancel] = useState(false)

  // View Result Dialog
  const [resultDialogOpen, setResultDialogOpen] = useState(false)
  const [viewingResult, setViewingResult] = useState<VisitResultData | null>(null)
  const [loadingResult, setLoadingResult] = useState(false)

  // Schedule Visit Dialog
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleFee, setScheduleFee] = useState('')
  const [scheduleProjectStatus, setScheduleProjectStatus] = useState<ProjectStatus>('UNDER_CONSTRUCTION')
  const [scheduleProjectSqft, setScheduleProjectSqft] = useState('')
  const [scheduleNotes, setScheduleNotes] = useState('')
  const [submittingSchedule, setSubmittingSchedule] = useState(false)

  // Substatus updating
  const [updatingSubStatus, setUpdatingSubStatus] = useState(false)
  const [openingQuotation, setOpeningQuotation] = useState(false)

  // Token Money states
  const [tokenTransactions, setTokenTransactions] = useState<TokenRecord[]>([])
  const [tokenTotal, setTokenTotal] = useState(0)
  const [financeAccounts, setFinanceAccounts] = useState<FinanceAccountOption[]>([])
  const [sdcUsers, setSdcUsers] = useState<SdcUserOption[]>([])
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false)
  const [tokenAmount, setTokenAmount] = useState('')
  const [tokenCollectedById, setTokenCollectedById] = useState('')
  const [tokenFinanceAccountId, setTokenFinanceAccountId] = useState('')
  const [tokenDate, setTokenDate] = useState(() => new Date().toISOString().split('T')[0])
  const [tokenNotes, setTokenNotes] = useState('')
  const [tokenReceiptNo, setTokenReceiptNo] = useState('')
  const [submittingToken, setSubmittingToken] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [leadRes, visitsRes, tokenRes] = await Promise.all([
        fetch(`/api/lead/${leadId}`),
        fetch(`/api/visit-schedule?visitType=PARTIAL_WORK_VISIT&leadId=${leadId}`),
        fetch(`/api/crm/token-money?leadId=${leadId}`),
      ])
      const leadData = await leadRes.json()
      const visitsData = await visitsRes.json()
      const tokenData = await tokenRes.json()

      if (leadData.success && leadData.data) {
        setLead(leadData.data)
      } else {
        setError(leadData.error || 'Failed to load lead info.')
        return
      }
      if (visitsData.success && Array.isArray(visitsData.data)) {
        setVisits(visitsData.data)
      }
      if (tokenData.success && tokenData.data) {
        setTokenTransactions(tokenData.data.transactions || [])
        setTokenTotal(tokenData.data.totalAmount || 0)
        setFinanceAccounts(tokenData.data.accounts || [])
        setSdcUsers(tokenData.data.sdcUsers || [])
        if (!tokenFinanceAccountId && tokenData.data.accounts?.length > 0) {
          setTokenFinanceAccountId(tokenData.data.accounts[0].id)
        }
        if (!tokenCollectedById && tokenData.data.sdcUsers?.length > 0) {
          setTokenCollectedById(tokenData.data.sdcUsers[0].id)
        }
      }
    } catch {
      setError('An error occurred while fetching data.')
    } finally {
      setLoading(false)
    }
  }, [leadId, tokenFinanceAccountId, tokenCollectedById])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const sortedVisits = useMemo(
    () =>
      [...visits].sort(
        (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
      ),
    [visits],
  )

  /* ── Modal openers ── */
  const openCompleteModal = (visit: PartialVisitRecord) => {
    setSelectedVisit(visit)
    setClientName(visit.lead?.name || lead?.name || '')
    setRemarks('')
    setBudget(
      visit.lead?.budget
        ? String(visit.lead.budget)
        : lead?.budget
        ? String(lead.budget)
        : '',
    )
    setRequirements('')
    setProjectStatus(visit.projectStatus || 'UNDER_CONSTRUCTION')
    setNextFollowUp('')
    setProjectType('RESIDENTIAL')
    setPriority('IMMEDIATE')
    setSelectedFiles(null)
    setCompleteDialogOpen(true)
  }

  const openRescheduleModal = (visit: PartialVisitRecord) => {
    setSelectedVisit(visit)
    setRescheduleDate('')
    setRescheduleNotes('')
    setRescheduleDialogOpen(true)
  }

  const openCancelModal = (visit: PartialVisitRecord) => {
    setSelectedVisit(visit)
    setCancelReason('')
    setCancelDialogOpen(true)
  }

  const openViewResultModal = async (visit: PartialVisitRecord) => {
    setSelectedVisit(visit)
    setViewingResult(null)
    setResultDialogOpen(true)
    setLoadingResult(true)
    try {
      const res = await fetch(`/api/visit-schedule/${visit.id}/result`)
      const data = await res.json()
      if (data.success && data.data?.leadResult) {
        setViewingResult(data.data.leadResult)
      } else if (data.data?.supportResults?.length > 0) {
        setViewingResult(data.data.supportResults[0])
      }
    } catch {
      toast.error('Failed to load visit result details')
    } finally {
      setLoadingResult(false)
    }
  }

  /* ── Action handlers ── */
  const handleCompleteSubmit = async () => {
    if (!selectedVisit) return
    if (!remarks.trim()) {
      toast.error('Remarks / Visit Summary is required')
      return
    }
    setSubmittingComplete(true)
    try {
      const formData = new FormData()
      formData.append('leadClientName', clientName)
      formData.append('summary', remarks)
      formData.append('budgetRange', budget)
      if (budget.trim() && !isNaN(Number(budget))) formData.append('budget', budget)
      formData.append('stylePreference', requirements)
      formData.append('projectStatus', projectStatus)
      if (nextFollowUp) formData.append('nextFollowUpAt', new Date(nextFollowUp).toISOString())
      formData.append('projectType', projectType)
      formData.append('timelineUrgency', priority)
      if (selectedFiles && selectedFiles.length > 0) {
        Array.from(selectedFiles).forEach((file) => formData.append('files', file))
      }
      const res = await fetch(`/api/visit-schedule/${selectedVisit.id}/result`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Partial Visit marked as completed!')
        setCompleteDialogOpen(false)
        fetchData()
      } else {
        toast.error(data.error || 'Failed to submit visit completion data')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setSubmittingComplete(false)
    }
  }

  const handleRescheduleSubmit = async () => {
    if (!selectedVisit) return
    if (!rescheduleDate) {
      toast.error('New date and time is required')
      return
    }
    setSubmittingReschedule(true)
    try {
      const res = await fetch(`/api/visit-schedule/${selectedVisit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'RESCHEDULED',
          scheduledAt: new Date(rescheduleDate).toISOString(),
          notes: rescheduleNotes || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Visit rescheduled successfully!')
        setRescheduleDialogOpen(false)
        fetchData()
      } else {
        toast.error(data.error || 'Failed to reschedule visit')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setSubmittingReschedule(false)
    }
  }

  const handleCancelSubmit = async () => {
    if (!selectedVisit) return
    setSubmittingCancel(true)
    try {
      const res = await fetch(`/api/visit-schedule/${selectedVisit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED', reason: cancelReason || undefined }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Visit cancelled successfully')
        setCancelDialogOpen(false)
        fetchData()
      } else {
        toast.error(data.error || 'Failed to cancel visit')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setSubmittingCancel(false)
    }
  }

  const handleSubStatusChange = async (newSubStatus: string) => {
    setUpdatingSubStatus(true)
    try {
      const res = await fetch(`/api/lead/${leadId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'PARTIAL_QUOTATION_PHASE',
          subStatus: newSubStatus,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Substatus updated to ${newSubStatus.replace(/_/g, ' ')}`)
        setLead((prev) => (prev ? { ...prev, stage: 'PARTIAL_QUOTATION_PHASE', subStatus: newSubStatus } : null))
      } else {
        toast.error(data.error || 'Failed to update substatus')
      }
    } catch {
      toast.error('Failed to update substatus')
    } finally {
      setUpdatingSubStatus(false)
    }
  }

  const handleScheduleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!scheduleDate) {
      toast.error('Visit date and time is required')
      return
    }
    setSubmittingSchedule(true)
    try {
      const res = await fetch(`/api/lead/${leadId}/visit-schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitType: 'PARTIAL_WORK_VISIT',
          scheduledAt: new Date(scheduleDate).toISOString(),
          location: lead?.location || undefined,
          visitFee: scheduleFee ? Number(scheduleFee) : 0,
          projectStatus: scheduleProjectStatus,
          projectSqft: scheduleProjectSqft ? Number(scheduleProjectSqft) : undefined,
          notes: scheduleNotes || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Partial visit scheduled successfully!')
        setScheduleDialogOpen(false)
        fetchData()
      } else {
        toast.error(data.error || 'Failed to schedule visit')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setSubmittingSchedule(false)
    }
  }

  const openPartialQuotation = async () => {
    setOpeningQuotation(true)
    try {
      await fetch(`/api/partial-quotation/${leadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      })
    } catch (err) {
      console.error(err)
    } finally {
      setOpeningQuotation(false)
    }
    router.push(`/visit-team/partial-visits/${leadId}/quotation`)
  }

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tokenAmount || Number(tokenAmount) <= 0) {
      toast.error('Please enter a valid token amount.')
      return
    }
    if (!tokenCollectedById) {
      toast.error('Please select the Special Design Consultant who collected the token.')
      return
    }
    if (!tokenFinanceAccountId) {
      toast.error('Please select the Accounts destination (Cash/Bank account).')
      return
    }

    setSubmittingToken(true)
    try {
      const res = await fetch('/api/crm/token-money', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          amount: Number(tokenAmount),
          collectedById: tokenCollectedById,
          financeAccountId: tokenFinanceAccountId,
          date: tokenDate,
          notes: tokenNotes,
          receiptNo: tokenReceiptNo,
        }),
      })
      const result = await res.json()
      if (result.success) {
        toast.success(result.message || 'Token money recorded successfully!')
        setTokenDialogOpen(false)
        setTokenAmount('')
        setTokenNotes('')
        setTokenReceiptNo('')
        fetchData()
      } else {
        toast.error(result.error || 'Failed to record token money.')
      }
    } catch {
      toast.error('Network error while recording token money.')
    } finally {
      setSubmittingToken(false)
    }
  }

  /* ── Render ── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Loading partial visit details...</p>
      </div>
    )
  }

  if (error || !lead) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-destructive">
        <p className="font-semibold">{error || 'Lead not found.'}</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6 w-full max-w-7xl mx-auto">
      {/* Back button */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Back to Partial Visits
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading}
          className="gap-1.5 ml-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Pre-Visit Quotation Info Banner */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 dark:bg-indigo-950/30 dark:border-indigo-800 p-3.5 text-xs text-indigo-900 dark:text-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>
            <strong>Quotation Available Anytime:</strong> You can create, edit, and download Short & Detail Quotations at any stage—before or after site visit completion.
          </span>
        </div>
        <Button
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-7 shrink-0 gap-1.5"
          onClick={openPartialQuotation}
        >
          <FileText className="h-3.5 w-3.5" />
          Create / Edit Quotation
        </Button>
      </div>

      {/* Lead Info Card */}
      <Card className="border-indigo-200/60 bg-gradient-to-br from-indigo-50/60 to-white dark:from-indigo-950/20 dark:to-background dark:border-indigo-800/40 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <CardTitle className="text-xl font-bold">{lead.name}</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Lead ID: {lead.id}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {lead.stage && (
                <Badge
                  variant="outline"
                  className="bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 font-semibold"
                >
                  {stageLabel(lead.stage)}
                </Badge>
              )}
              {lead.stage === 'PARTIAL_QUOTATION_PHASE' ? (
                <div className="inline-flex items-center gap-1.5 bg-background border border-indigo-200 dark:border-indigo-800 rounded-md px-2 py-0.5 shadow-2xs">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">Substatus:</span>
                  <select
                    value={lead.subStatus ?? 'QUOTATION_WORKING'}
                    disabled={updatingSubStatus}
                    onChange={(e) => void handleSubStatusChange(e.target.value)}
                    className="text-xs font-semibold bg-transparent text-foreground focus:outline-hidden cursor-pointer"
                  >
                    <option value="QUOTATION_WORKING">Quotation working</option>
                    <option value="QUOTATION_COMPLETED">Quotation Complete</option>
                    <option value="BUDGET_MEETING_SET">Budget meeting</option>
                    <option value="FUTURE_CLIENT">Future Client</option>
                  </select>
                  {updatingSubStatus && <Loader2 className="h-3 w-3 animate-spin text-indigo-600" />}
                </div>
              ) : lead.subStatus ? (
                <Badge variant="outline" className="text-xs">
                  {stageLabel(lead.subStatus)}
                </Badge>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                className="border-emerald-500/60 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 gap-1.5 shadow-xs font-semibold"
                onClick={() => setTokenDialogOpen(true)}
              >
                <Coins className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Receive Token Money
              </Button>
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm"
                onClick={openPartialQuotation}
                disabled={openingQuotation}
              >
                {openingQuotation ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Partial Quotation Builder
              </Button>
              <Link
                href={`/crm/admin/leads/${lead.id}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Admin View
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium">{lead.phone || '—'}</span>
            </div>
            {lead.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{lead.location}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{formatCurrency(lead.budget)}</span>
            </div>
            {lead.source && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{lead.source}</span>
              </div>
            )}
          </div>
          {lead.remarks && (
            <>
              <Separator className="my-3" />
              <p className="text-xs text-muted-foreground italic">"{lead.remarks}"</p>
            </>
          )}

          {tokenTotal > 0 && (
            <div className="mt-4 p-3 rounded-lg border border-emerald-300 bg-emerald-50/90 dark:bg-emerald-950/40 dark:border-emerald-800 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-emerald-950 dark:text-emerald-100 font-medium">
                  <strong>Token Money Received:</strong> ৳{tokenTotal.toLocaleString('en-BD')} (Verbal confirmation secured • Lead stage stays unchanged)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 text-[11px] font-semibold">
                  {tokenTransactions.length} receipt{tokenTransactions.length > 1 ? 's' : ''}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/60 px-2"
                  onClick={() => setTokenDialogOpen(true)}
                >
                  + Add More Token
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Token Money History Section (if any) */}
      {tokenTransactions.length > 0 && (
        <Card className="border-emerald-200/60 bg-white dark:bg-card shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <CardTitle className="text-base font-bold">Token Money Receipts</CardTitle>
              <Badge variant="secondary" className="ml-1 text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Total: ৳{tokenTotal.toLocaleString('en-BD')}
              </Badge>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 gap-1 border-emerald-400 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300"
              onClick={() => setTokenDialogOpen(true)}
            >
              <Plus className="h-3 w-3" /> Add Token
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="p-2.5 font-semibold">Date</th>
                    <th className="p-2.5 font-semibold">Amount</th>
                    <th className="p-2.5 font-semibold">Special Design Consultant</th>
                    <th className="p-2.5 font-semibold">Accounts Destination</th>
                    <th className="p-2.5 font-semibold">Receipt / Ref</th>
                    <th className="p-2.5 font-semibold">Particulars</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tokenTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/20">
                      <td className="p-2.5 whitespace-nowrap">{formatDate(tx.date)}</td>
                      <td className="p-2.5 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        ৳{tx.amount.toLocaleString('en-BD')}
                      </td>
                      <td className="p-2.5 font-medium whitespace-nowrap">
                        {tx.collectedBy?.fullName || '—'}
                      </td>
                      <td className="p-2.5 whitespace-nowrap">
                        {tx.financeAccount?.name || '—'}
                      </td>
                      <td className="p-2.5 font-mono text-[11px] text-muted-foreground">{tx.reference || '—'}</td>
                      <td className="p-2.5 text-muted-foreground">{tx.particular || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visit History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            Partial Visit History
            <Badge variant="secondary" className="ml-1 text-xs">
              {visits.length}
            </Badge>
          </h2>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs h-8"
            onClick={() => {
              setScheduleDate('')
              setScheduleFee('')
              setScheduleProjectStatus('UNDER_CONSTRUCTION')
              setScheduleProjectSqft('')
              setScheduleNotes('')
              setScheduleDialogOpen(true)
            }}
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            Schedule Partial Visit
          </Button>
        </div>

        {sortedVisits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-muted/10 rounded-xl border space-y-3">
            <Wrench className="h-8 w-8 text-muted-foreground/50 mb-1" />
            <p className="font-semibold text-foreground text-sm">
              No partial visits scheduled yet for this client.
            </p>
            <p className="text-xs text-muted-foreground max-w-md">
              A visit is not required to create a quotation. You can start working on a quotation immediately or schedule a partial visit whenever needed.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                onClick={openPartialQuotation}
                disabled={openingQuotation}
              >
                {openingQuotation ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Create Quotation
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => {
                  setScheduleDate('')
                  setScheduleFee('')
                  setScheduleProjectStatus('UNDER_CONSTRUCTION')
                  setScheduleProjectSqft('')
                  setScheduleNotes('')
                  setScheduleDialogOpen(true)
                }}
              >
                <CalendarPlus className="h-4 w-4" />
                Schedule Partial Visit
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedVisits.map((visit, index) => {
              const statusConfig = getStatusConfig(visit.status)
              const StatusIcon = statusConfig.icon
              const isActionable =
                visit.status === 'SCHEDULED' || visit.status === 'RESCHEDULED'

              return (
                <Card
                  key={visit.id}
                  className="border transition duration-200 hover:border-primary/40 hover:shadow-sm"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                        Visit #{visits.length - index}
                      </span>
                      <Badge
                        variant="outline"
                        className={`shrink-0 font-medium px-2.5 py-0.5 gap-1 ${statusConfig.badgeClass}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </Badge>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3 text-sm text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border/50 mb-4">
                      <div className="flex items-center gap-2">
                        <CalendarClock className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="font-semibold text-foreground">
                          {formatDate(visit.scheduledAt)}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <span className="line-clamp-2">
                          {visit.location || visit.lead?.location || 'Location not specified'}
                        </span>
                      </div>
                      {visit.assignedTo && (
                        <div className="flex items-center gap-2 sm:col-span-2 pt-2 border-t border-border/40">
                          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>
                            Consultant:{' '}
                            <strong className="text-foreground">
                              {visit.assignedTo.fullName}
                            </strong>
                          </span>
                        </div>
                      )}
                      {visit.notes && (
                        <div className="sm:col-span-2 text-[11px] italic text-muted-foreground/90 pt-2 border-t border-border/40">
                          "{visit.notes}"
                        </div>
                      )}
                      {(visit.visitFee != null ||
                        visit.projectSqft != null ||
                        visit.projectStatus) && (
                        <div className="sm:col-span-2 flex items-center gap-4 pt-2 border-t border-border/40 text-xs flex-wrap">
                          {visit.visitFee != null && (
                            <span>
                              Visit Fee:{' '}
                              <strong className="text-foreground">
                                {formatCurrency(visit.visitFee)}
                              </strong>
                            </span>
                          )}
                          {visit.projectSqft != null && (
                            <span>
                              Sqft:{' '}
                              <strong className="text-foreground">
                                {visit.projectSqft.toLocaleString()}
                              </strong>
                            </span>
                          )}
                          {visit.projectStatus && (
                            <span>
                              Project:{' '}
                              <strong className="text-foreground">
                                {stageLabel(visit.projectStatus)}
                              </strong>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      {isActionable ? (
                        <>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm h-8 text-xs font-semibold gap-1"
                            onClick={() => openCompleteModal(visit)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Complete Visit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1"
                            onClick={() => openRescheduleModal(visit)}
                          >
                            <Calendar className="h-3.5 w-3.5" />
                            Reschedule
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs text-destructive hover:bg-destructive/10 gap-1 px-2"
                            onClick={() => openCancelModal(visit)}
                          >
                            <Ban className="h-3.5 w-3.5" />
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1.5"
                            onClick={() => openViewResultModal(visit)}
                          >
                            <FileText className="h-3.5 w-3.5 text-primary" />
                            View Result
                          </Button>
                          {visit.status === 'COMPLETED' ? (
                            <Button
                              size="sm"
                              className="h-8 bg-indigo-600 text-xs hover:bg-indigo-700"
                              onClick={openPartialQuotation}
                            >
                              <FileText className="mr-1 h-3.5 w-3.5" />
                              {lead.subStatus === 'QUOTATION_ASSIGNED' || lead.subStatus === 'QUOTATION_WORKING' || lead.subStatus === 'QUOTATION_COMPLETED'
                                ? 'Open Partial Quotation'
                                : 'Create Partial Quotation'}
                            </Button>
                          ) : null}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Visit Complete Dialog ── */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
              Complete Partial Visit
            </DialogTitle>
            <DialogDescription>
              Record completion details for{' '}
              <strong>{selectedVisit ? formatDate(selectedVisit.scheduledAt) : ''}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="d-clientName" className="font-semibold text-xs">
                Client Name{' '}
                <span className="text-xs text-muted-foreground font-normal">(Editable)</span>
              </Label>
              <Input
                id="d-clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Client Name"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="d-remarks" className="font-semibold text-xs">
                Remarks / Visit Summary <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="d-remarks"
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Detailed summary of the partial visit..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-budget" className="font-semibold text-xs">
                Budget <span className="text-xs text-muted-foreground font-normal">(৳ BDT)</span>
              </Label>
              <Input
                id="d-budget"
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. 1500000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-projectType" className="font-semibold text-xs">Project Type</Label>
              <Select value={projectType} onValueChange={(v) => setProjectType(v as typeof projectType)}>
                <SelectTrigger id="d-projectType"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RESIDENTIAL">Residential</SelectItem>
                  <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-projectStatus" className="font-semibold text-xs">Project Status</Label>
              <Select value={projectStatus} onValueChange={(v) => setProjectStatus(v as ProjectStatus)}>
                <SelectTrigger id="d-projectStatus"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNDER_CONSTRUCTION">Under Construction</SelectItem>
                  <SelectItem value="READY">Ready</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-priority" className="font-semibold text-xs">Timeline / Urgency</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger id="d-priority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IMMEDIATE">Immediate</SelectItem>
                  <SelectItem value="1-2 months">1–2 Months</SelectItem>
                  <SelectItem value="2-3 months">2–3 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="d-requirements" className="font-semibold text-xs">Style Preference / Requirements</Label>
              <Textarea
                id="d-requirements"
                rows={2}
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="Client style preferences, special requirements..."
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="d-followup" className="font-semibold text-xs">Next Follow-Up Date</Label>
              <Input
                id="d-followup"
                type="datetime-local"
                value={nextFollowUp}
                onChange={(e) => setNextFollowUp(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="d-files" className="font-semibold text-xs flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5" /> Attachments
              </Label>
              <Input
                id="d-files"
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={(e) => setSelectedFiles(e.target.files)}
                className="text-sm"
              />
              {selectedFiles && selectedFiles.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCompleteSubmit}
              disabled={submittingComplete}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              {submittingComplete ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {submittingComplete ? 'Submitting...' : 'Mark as Completed'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reschedule Dialog ── */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Calendar className="h-5 w-5" />
              Reschedule Visit
            </DialogTitle>
            <DialogDescription>Choose a new date and time for the partial visit.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="d-rescheduleDate" className="font-semibold text-xs">
                New Date & Time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="d-rescheduleDate"
                type="datetime-local"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-rescheduleNotes" className="font-semibold text-xs">Notes (optional)</Label>
              <Textarea
                id="d-rescheduleNotes"
                rows={2}
                value={rescheduleNotes}
                onChange={(e) => setRescheduleNotes(e.target.value)}
                placeholder="Reason for rescheduling..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRescheduleSubmit} disabled={submittingReschedule}>
              {submittingReschedule && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {submittingReschedule ? 'Rescheduling...' : 'Confirm Reschedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cancel Dialog ── */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="h-5 w-5" />
              Cancel Visit
            </DialogTitle>
            <DialogDescription>Provide a reason for cancelling this partial visit.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor="d-cancelReason" className="font-semibold text-xs">Reason (optional)</Label>
            <Textarea
              id="d-cancelReason"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Why is this visit being cancelled?"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Back</Button>
            <Button variant="destructive" onClick={handleCancelSubmit} disabled={submittingCancel}>
              {submittingCancel && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {submittingCancel ? 'Cancelling...' : 'Confirm Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Result Dialog ── */}
      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Visit Result
            </DialogTitle>
            <DialogDescription>
              Result for visit on{' '}
              {selectedVisit ? formatDate(selectedVisit.scheduledAt) : ''}
            </DialogDescription>
          </DialogHeader>
          {loadingResult ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : viewingResult ? (
            <div className="space-y-4 py-2">
              <div className="space-y-2 bg-muted/40 rounded-lg p-4 border">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Summary</p>
                <p className="text-sm">{viewingResult.summary || '—'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {viewingResult.projectType && (
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">Project Type</p>
                    <p>{viewingResult.projectType}</p>
                  </div>
                )}
                {viewingResult.budgetRange && (
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">Budget Range</p>
                    <p>{viewingResult.budgetRange}</p>
                  </div>
                )}
                {viewingResult.timelineUrgency && (
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">Timeline</p>
                    <p>{viewingResult.timelineUrgency}</p>
                  </div>
                )}
                {viewingResult.stylePreference && (
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">Style / Requirements</p>
                    <p>{viewingResult.stylePreference}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Completed At</p>
                  <p>{formatDate(viewingResult.completedAt)}</p>
                </div>
              </div>
              {viewingResult.files && viewingResult.files.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5" /> Attachments ({viewingResult.files.length})
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {viewingResult.files.map((file) => {
                      const isImage = file.fileType?.startsWith('image/')
                      return (
                        <a
                          key={file.id}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex flex-col items-center gap-1 rounded-lg border p-2 hover:border-primary/50 hover:bg-muted/40 transition text-center"
                        >
                          {isImage ? (
                            <ImageIcon className="h-6 w-6 text-blue-500" />
                          ) : (
                            <Paperclip className="h-6 w-6 text-muted-foreground" />
                          )}
                          <span className="text-[10px] text-muted-foreground line-clamp-2 group-hover:text-primary">
                            {file.fileName}
                          </span>
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No result data available for this visit.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResultDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Partial Visit Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-primary" />
              Schedule Partial Visit
            </DialogTitle>
            <DialogDescription>
              Schedule a new partial work visit for <strong>{lead.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleScheduleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="scheduleDate" className="text-xs font-semibold">
                Visit Date & Time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="scheduleDate"
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="scheduleFee" className="text-xs font-semibold">
                  Visit Fee (BDT)
                </Label>
                <Input
                  id="scheduleFee"
                  type="number"
                  placeholder="0"
                  value={scheduleFee}
                  onChange={(e) => setScheduleFee(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="scheduleProjectStatus" className="text-xs font-semibold">
                  Site Status
                </Label>
                <Select
                  value={scheduleProjectStatus}
                  onValueChange={(val: ProjectStatus) => setScheduleProjectStatus(val)}
                >
                  <SelectTrigger id="scheduleProjectStatus" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNDER_CONSTRUCTION">Under Construction</SelectItem>
                    <SelectItem value="READY">Ready</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="scheduleProjectSqft" className="text-xs font-semibold">
                Approx. Sqft
              </Label>
              <Input
                id="scheduleProjectSqft"
                type="number"
                placeholder="e.g. 1200"
                value={scheduleProjectSqft}
                onChange={(e) => setScheduleProjectSqft(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="scheduleNotes" className="text-xs font-semibold">
                Visit Notes / Instructions
              </Label>
              <Textarea
                id="scheduleNotes"
                rows={2}
                placeholder="Optional notes for the visit..."
                value={scheduleNotes}
                onChange={(e) => setScheduleNotes(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setScheduleDialogOpen(false)}
                disabled={submittingSchedule}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submittingSchedule}>
                {submittingSchedule && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Schedule Visit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Token Money Dialog */}
      <Dialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <Coins className="h-5 w-5" />
              Record Token Money (Verbal Confirmation)
            </DialogTitle>
            <DialogDescription>
              Record token money from <strong>{lead.name}</strong>. This connects to Accounts as an inflow without altering the lead stage.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTokenSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="tokenAmount" className="text-xs font-semibold">
                Token Amount (BDT) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tokenAmount"
                type="number"
                min="1"
                placeholder="e.g. 10000"
                value={tokenAmount}
                onChange={(e) => setTokenAmount(e.target.value)}
                required
                className="font-bold text-base"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tokenCollectedBy" className="text-xs font-semibold">
                Special Design Consultant (Collected By) <span className="text-destructive">*</span>
              </Label>
              <Select
                value={tokenCollectedById}
                onValueChange={setTokenCollectedById}
              >
                <SelectTrigger id="tokenCollectedBy" className="h-9">
                  <SelectValue placeholder="Select consultant" />
                </SelectTrigger>
                <SelectContent>
                  {sdcUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.fullName} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tokenFinanceAccount" className="text-xs font-semibold">
                Accounts Destination (Finance Account) <span className="text-destructive">*</span>
              </Label>
              <Select
                value={tokenFinanceAccountId}
                onValueChange={setTokenFinanceAccountId}
              >
                <SelectTrigger id="tokenFinanceAccount" className="h-9">
                  <SelectValue placeholder="Select Cash / Bank Account" />
                </SelectTrigger>
                <SelectContent>
                  {financeAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type}) {acc.accountNumber ? `— ${acc.accountNumber}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tokenDate" className="text-xs font-semibold">
                  Payment Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="tokenDate"
                  type="date"
                  value={tokenDate}
                  onChange={(e) => setTokenDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tokenReceiptNo" className="text-xs font-semibold">
                  Receipt / Ref No.
                </Label>
                <Input
                  id="tokenReceiptNo"
                  placeholder="Optional receipt #"
                  value={tokenReceiptNo}
                  onChange={(e) => setTokenReceiptNo(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tokenNotes" className="text-xs font-semibold">
                Notes / Particulars
              </Label>
              <Textarea
                id="tokenNotes"
                rows={2}
                placeholder="Verbal confirmation token money notes..."
                value={tokenNotes}
                onChange={(e) => setTokenNotes(e.target.value)}
              />
            </div>

            <div className="p-2.5 rounded-md bg-muted/60 text-[11px] text-muted-foreground border">
              ℹ️ <strong>Note:</strong> Token money confirms verbal client agreement. The partial lead stays in its current workflow stage.
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTokenDialogOpen(false)}
                disabled={submittingToken}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                disabled={submittingToken}
              >
                {submittingToken && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm & Record Token
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
