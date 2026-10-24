'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Download,
  FileCheck2,
  FileEdit,
  FileSpreadsheet,
  FileText,
  Loader2,
  MapPin,
  Phone,
  Receipt,
  Search,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { CrmPageHeader } from '@/components/crm/shared/page-header'
import { DetailQuotationDocument } from '@/components/crm/quotation/pdf/DetailQuotationDocument'
import { AgreementDocumentPdf } from '@/components/crm/quotation/pdf/AgreementDocument'
import { downloadPdfFromDocument } from '@/components/crm/quotation/pdf/pdf-download'
import { withDetailQuotationDefaults } from '@/lib/detail-quotation-format'
import { calculateQuotationTotals } from '@/lib/quotation-calculations'
import type { AgreementContent } from '@/lib/agreement-template'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Staff = { id: string; fullName: string; email: string }

type AgreementLead = {
  id: string
  name: string
  phone: string | null
  email: string | null
  location: string | null
  stage: string
  subStatus: string | null
  agreementType: string | null
  accountStatus: string | null
  slotIndex?: number
  originalQuotationTotal: number
  discountApplied: number
  settledAgreementValue: number | null
  updatedAt: string
  detailQuotationAvailable: boolean
  srCrm: Staff | null
  boqAssignee: Staff | null
}

type AgreementLeadsResponse = {
  success: boolean
  data?: AgreementLead[]
  error?: string
}

type FilterTab = 'all' | 'boq-pending' | 'boq-assigned' | 'with-boq'

function formatMoney(value: number | null | undefined) {
  if (value == null) return '—'
  return `৳ ${Math.round(value).toLocaleString('en-IN')}`
}

function formatAgreementType(value: string | null) {
  if (!value) return 'Confirmed'
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function boqEligible(lead: AgreementLead) {
  void lead
  return true
}

export function AgreementLeadsBoard({
  title = 'Agreement Leads',
  subtitle = 'Confirmed agreements with quotation totals, discounts, settled values, and detail quotation downloads.',
  editorBasePath = '/crm/admin/agreement-leads',
}: {
  title?: string
  subtitle?: string
  editorBasePath?: string
}) {
  const [leads, setLeads] = useState<AgreementLead[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [selectedBoq, setSelectedBoq] = useState<Record<string, string>>({})
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [loading, setLoading] = useState(true)
  const [staffLoading, setStaffLoading] = useState(true)
  const [savingBoqId, setSavingBoqId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [downloadingAgreementId, setDownloadingAgreementId] = useState<string | null>(null)
  const [assignError, setAssignError] = useState<Record<string, string>>({})

  const loadLeads = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const response = await fetch(`/api/agreement-leads?${params.toString()}`, { cache: 'no-store' })
      const payload = (await response.json()) as AgreementLeadsResponse
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? 'Failed to load Agreement Leads')
      }
      const nextLeads = payload.data ?? []
      setLeads(nextLeads)
      setSelectedBoq((current) => {
        const next = { ...current }
        nextLeads.forEach((lead) => {
          if (!(lead.id in next)) next[lead.id] = lead.boqAssignee?.id ?? ''
        })
        return next
      })
    } catch (error) {
      setLeads([])
      toast.error(error instanceof Error ? error.message : 'Failed to load Agreement Leads')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    void loadLeads()
  }, [loadLeads])

  useEffect(() => {
    const loadStaff = async () => {
      setStaffLoading(true)
      try {
        const response = await fetch('/api/department/available/BOQ', { cache: 'no-store' })
        const payload = await response.json()
        if (!response.ok || !payload.success) throw new Error(payload.error ?? 'Failed to load BOQ staff')
        setStaff(payload.users ?? [])
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load BOQ staff')
      } finally {
        setStaffLoading(false)
      }
    }
    void loadStaff()
  }, [])

  const assignBoq = async (lead: AgreementLead) => {
    const userId = selectedBoq[lead.id]
    if (!userId || !boqEligible(lead)) return

    setSavingBoqId(lead.id)
    setAssignError((prev) => ({ ...prev, [lead.id]: '' }))
    try {
      const response = await fetch(`/api/lead/${lead.id}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, department: 'BOQ' }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        const errMsg = payload.error ?? 'Failed to assign BOQ staff'
        setAssignError((prev) => ({ ...prev, [lead.id]: errMsg }))
        throw new Error(errMsg)
      }
      toast.success(lead.boqAssignee ? 'BOQ staff reassigned successfully.' : 'BOQ staff assigned successfully.')
      await loadLeads()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign BOQ staff')
    } finally {
      setSavingBoqId(null)
    }
  }

  const downloadDetailQuotation = async (lead: AgreementLead) => {
    setDownloadingId(lead.id)
    try {
      const slot = lead.slotIndex ?? 1
      const response = await fetch(
        `/api/lead/${lead.id}/quotation-draft?documentType=detail&slot=${slot}`,
        { cache: 'no-store' },
      )
      const payload = await response.json()
      if (!response.ok || !payload?.success || !payload?.data) {
        throw new Error(payload?.error ?? 'Failed to load detail quotation')
      }

      const source = payload.data.draft ?? payload.data.defaultDetailDraft
      if (!source?.content) throw new Error('No detail quotation is available for this lead')

      const content = withDetailQuotationDefaults(source.content)
      const totals = calculateQuotationTotals(content)
      const downloadedAt = new Date().toISOString()
      const quotationCode = `DQ-AGR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${lead.id.slice(-6).toUpperCase()}`
      const contentForDownload = { ...content, quotationCode, downloadedAt }
      const safeClientName = (lead.name || 'Client').replace(/[^a-z0-9]/gi, '_').toLowerCase()

      await downloadPdfFromDocument(
        <DetailQuotationDocument
          clientName={contentForDownload.clientName || lead.name}
          clientAddress={contentForDownload.clientAddress || lead.location}
          content={contentForDownload}
          totals={totals}
          agreementSummary={{
            originalQuotationTotal: lead.originalQuotationTotal,
            honoredAmount: lead.discountApplied,
            totalAmount: lead.settledAgreementValue ?? totals.grandTotal,
          }}
        />,
        `Detail_Quotation_Agreement_${safeClientName}_${quotationCode}.pdf`,
      )

      toast.success('Agreement Detail Quotation PDF downloaded')
    } catch (error) {
      console.error('Failed to download agreement detail quotation:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to download PDF')
    } finally {
      setDownloadingId(null)
    }
  }

  const downloadAgreement = async (lead: AgreementLead) => {
    setDownloadingAgreementId(lead.id)
    try {
      const response = await fetch(`/api/agreement-leads/${lead.id}`, { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error ?? 'Failed to load agreement')
      const data = payload.data as {
        agreement: AgreementContent
        quotation: Parameters<typeof AgreementDocumentPdf>[0]['quotation']
        totals: Parameters<typeof AgreementDocumentPdf>[0]['totals']
      }
      const safeName = lead.name.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'Client'
      await downloadPdfFromDocument(
        <AgreementDocumentPdf
          agreement={data.agreement}
          quotation={data.quotation}
          totals={data.totals}
          clientName={lead.name}
          agreementValue={lead.settledAgreementValue}
        />,
        `Agreement_${safeName}_${data.agreement.agreementDate}.pdf`,
      )
      toast.success('Agreement PDF downloaded')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to download agreement')
    } finally {
      setDownloadingAgreementId(null)
    }
  }

  // Summary Metrics
  const stats = useMemo(() => {
    const totalLeads = leads.length
    const totalSettled = leads.reduce((sum, lead) => sum + (lead.settledAgreementValue ?? 0), 0)
    const totalDiscount = leads.reduce((sum, lead) => sum + (lead.discountApplied ?? 0), 0)
    const boqAssignedCount = leads.filter((lead) => Boolean(lead.boqAssignee)).length
    const boqPendingCount = totalLeads - boqAssignedCount
    const withDetailCount = leads.filter((lead) => lead.detailQuotationAvailable).length
    return {
      totalLeads,
      totalSettled,
      totalDiscount,
      boqAssignedCount,
      boqPendingCount,
      withDetailCount,
    }
  }, [leads])

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (activeTab === 'boq-pending') return !lead.boqAssignee
      if (activeTab === 'boq-assigned') return Boolean(lead.boqAssignee)
      if (activeTab === 'with-boq') return lead.detailQuotationAvailable
      return true
    })
  }, [leads, activeTab])

  return (
    <div className="min-h-screen bg-muted/20">
      <CrmPageHeader title={title} subtitle={subtitle} />

      <main className="mx-auto max-w-[1600px] px-4 py-6 space-y-5">
        {/* ─── METRIC CARDS ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <Card className="border-border/80 shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Confirmed Agreements</p>
                <p className="text-2xl font-bold tracking-tight text-foreground mt-0.5">{stats.totalLeads}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Ready for execution</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <FileCheck2 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Settled Value</p>
                <p className="text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400 mt-0.5">
                  {formatMoney(stats.totalSettled)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Contract agreed value</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CircleDollarSign className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Discount / Honor</p>
                <p className="text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-400 mt-0.5">
                  {formatMoney(stats.totalDiscount)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Special client honor</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Receipt className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">BOQ Staff Assigned</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <p className="text-2xl font-bold tracking-tight text-foreground">{stats.boqAssignedCount}</p>
                  <span className="text-xs text-muted-foreground">/ {stats.totalLeads}</span>
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium mt-0.5">
                  {stats.boqPendingCount > 0 ? `${stats.boqPendingCount} pending assignment` : 'All assigned'}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Users className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── FILTERS & SEARCH BAR ─────────────────────────────────── */}
        <Card className="border-border/80 shadow-xs">
          <CardContent className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                variant={activeTab === 'all' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 text-xs font-medium"
                onClick={() => setActiveTab('all')}
              >
                All Agreements
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px]">
                  {stats.totalLeads}
                </Badge>
              </Button>

              <Button
                variant={activeTab === 'boq-pending' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 text-xs font-medium text-amber-700 dark:text-amber-300 hover:text-amber-800"
                onClick={() => setActiveTab('boq-pending')}
              >
                BOQ Pending
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300">
                  {stats.boqPendingCount}
                </Badge>
              </Button>

              <Button
                variant={activeTab === 'boq-assigned' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 text-xs font-medium"
                onClick={() => setActiveTab('boq-assigned')}
              >
                BOQ Assigned
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px]">
                  {stats.boqAssignedCount}
                </Badge>
              </Button>

              <Button
                variant={activeTab === 'with-boq' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 text-xs font-medium"
                onClick={() => setActiveTab('with-boq')}
              >
                Has Detail Quotation
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px]">
                  {stats.withDetailCount}
                </Badge>
              </Button>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search client, phone, location…"
                className="h-8 pl-8 pr-7 text-xs bg-background"
              />
              {searchInput ? (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* ─── DATA TABLE ───────────────────────────────────────────── */}
        {loading ? (
          <Card className="border-border/80">
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-xs">Loading agreement leads…</p>
            </CardContent>
          </Card>
        ) : filteredLeads.length === 0 ? (
          <Card className="border-border/80">
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="font-medium text-foreground">No agreement leads found</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {searchInput ? 'Try adjusting your search query or filters.' : 'Confirmed leads will appear here.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden border-border/80 shadow-xs">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-b">
                    <TableHead className="w-[230px] font-semibold text-foreground py-3">Client / Project</TableHead>
                    <TableHead className="w-[120px] font-semibold text-foreground py-3">Status</TableHead>
                    <TableHead className="w-[130px] text-right font-semibold text-foreground py-3">Quotation</TableHead>
                    <TableHead className="w-[110px] text-right font-semibold text-foreground py-3">Discount</TableHead>
                    <TableHead className="w-[140px] text-right font-semibold text-foreground py-3">Settled Value</TableHead>
                    <TableHead className="w-[130px] font-semibold text-foreground py-3">SR CRM</TableHead>
                    <TableHead className="w-[220px] font-semibold text-foreground py-3">BOQ Staff Assignment</TableHead>
                    <TableHead className="w-[170px] text-right font-semibold text-foreground py-3">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredLeads.map((lead) => {
                    const eligible = boqEligible(lead)
                    const currentBoqId = lead.boqAssignee?.id ?? ''
                    const selectedUserId = selectedBoq[lead.id] ?? currentBoqId
                    const hasPendingChange = selectedUserId !== currentBoqId && Boolean(selectedUserId)
                    const saving = savingBoqId === lead.id

                    return (
                      <TableRow key={lead.id} className="hover:bg-muted/20 transition-colors">
                        {/* 1. Client & Contact Info */}
                        <TableCell className="align-top py-3.5">
                          <div className="font-semibold text-foreground text-sm leading-tight hover:text-primary transition-colors">
                            <Link href={`${editorBasePath}/${lead.id}`}>{lead.name}</Link>
                          </div>

                          {lead.location ? (
                            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground" title={lead.location}>
                              <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                              <span className="truncate max-w-[200px]">{lead.location}</span>
                            </div>
                          ) : null}

                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                            {lead.phone ? (
                              <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-foreground">
                                <Phone className="h-2.5 w-2.5 text-muted-foreground/60" />
                                <span>{lead.phone}</span>
                              </a>
                            ) : null}
                            {lead.phone && lead.email ? <span>•</span> : null}
                            {lead.email ? (
                              <span className="truncate max-w-[130px]" title={lead.email}>
                                {lead.email}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>

                        {/* 2. Status / Stage */}
                        <TableCell className="align-top py-3.5">
                          <Badge variant="outline" className="font-medium bg-background border-border text-xs">
                            {formatAgreementType(lead.agreementType)}
                          </Badge>
                          <div className="mt-1 text-[11px] text-muted-foreground capitalize">
                            {(lead.subStatus || lead.stage).replace(/_/g, ' ').toLowerCase()}
                          </div>
                        </TableCell>

                        {/* 3. Original Quotation Total */}
                        <TableCell className="text-right align-top py-3.5 font-medium tabular-nums text-foreground">
                          {formatMoney(lead.originalQuotationTotal)}
                        </TableCell>

                        {/* 4. Discount Applied */}
                        <TableCell className="text-right align-top py-3.5 font-medium tabular-nums text-amber-700 dark:text-amber-400">
                          {lead.discountApplied > 0 ? `- ${formatMoney(lead.discountApplied)}` : '—'}
                        </TableCell>

                        {/* 5. Settled Agreement Value */}
                        <TableCell className="text-right align-top py-3.5 font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                          {formatMoney(lead.settledAgreementValue)}
                        </TableCell>

                        {/* 6. SR CRM */}
                        <TableCell className="align-top py-3.5">
                          {lead.srCrm?.fullName ? (
                            <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                              <UserRound className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate max-w-[110px]" title={lead.srCrm.fullName}>
                                {lead.srCrm.fullName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Unassigned</span>
                          )}
                        </TableCell>

                        {/* 7. BOQ Staff Assignment (Self-Contained UX) */}
                        <TableCell className="align-top py-3.5">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <Select
                                value={selectedUserId}
                                onValueChange={(value) => {
                                  setSelectedBoq((current) => ({ ...current, [lead.id]: value }))
                                  setAssignError((prev) => ({ ...prev, [lead.id]: '' }))
                                }}
                                disabled={!eligible || staffLoading || saving}
                              >
                                <SelectTrigger className="h-8 text-xs flex-1 bg-background">
                                  <SelectValue placeholder="Select BOQ staff" />
                                </SelectTrigger>
                                <SelectContent>
                                  {staff.map((user) => (
                                    <SelectItem key={user.id} value={user.id} className="text-xs">
                                      {user.fullName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {hasPendingChange ? (
                                <Button
                                  size="sm"
                                  className="h-8 px-2.5 text-xs shrink-0"
                                  disabled={saving}
                                  onClick={() => void assignBoq(lead)}
                                  title="Confirm BOQ Assignment"
                                >
                                  {saving ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5" />
                                  )}
                                  <span className="ml-1 hidden sm:inline">Save</span>
                                </Button>
                              ) : null}
                            </div>

                            {lead.boqAssignee ? (
                              <div className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                                <CheckCircle2 className="h-3 w-3 shrink-0" />
                                <span className="truncate max-w-[190px]">
                                  Current: {lead.boqAssignee.fullName}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                <AlertCircle className="h-3 w-3 shrink-0" />
                                <span>Pending BOQ Assignment</span>
                              </div>
                            )}

                            {assignError[lead.id] ? (
                              <div className="text-[11px] text-red-600 dark:text-red-400">
                                {assignError[lead.id]}
                              </div>
                            ) : null}
                          </div>
                        </TableCell>

                        {/* 8. Row Actions (Compact, Symmetrical) */}
                        <TableCell className="text-right align-top py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs font-medium" asChild>
                              <Link href={`${editorBasePath}/${lead.id}`}>
                                <FileEdit className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                                Edit
                              </Link>
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="h-8 px-2.5 text-xs font-medium bg-[#1f363d] text-white hover:bg-[#16272c]"
                                  disabled={downloadingAgreementId === lead.id || downloadingId === lead.id}
                                >
                                  {downloadingAgreementId === lead.id || downloadingId === lead.id ? (
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Download className="mr-1.5 h-3.5 w-3.5" />
                                  )}
                                  PDF
                                  <ChevronDown className="ml-1 h-3 w-3 opacity-70" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem onClick={() => void downloadAgreement(lead)}>
                                  <FileText className="mr-2 h-4 w-4 text-[#a57c00]" />
                                  <span>Download Agreement PDF</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => void downloadDetailQuotation(lead)}
                                  disabled={!lead.detailQuotationAvailable}
                                >
                                  <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                                  <span>Download Detail Quotation</span>
                                  {!lead.detailQuotationAvailable && (
                                    <span className="ml-auto text-[10px] text-muted-foreground">N/A</span>
                                  )}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </main>
    </div>
  )
}
