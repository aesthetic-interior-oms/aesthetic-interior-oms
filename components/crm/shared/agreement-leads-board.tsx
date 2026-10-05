'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, Loader2, Search, UserRound } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { CrmPageHeader } from '@/components/crm/shared/page-header'
import { DetailQuotationDocument } from '@/components/crm/quotation/pdf/DetailQuotationDocument'
import { downloadPdfFromDocument } from '@/components/crm/quotation/pdf/pdf-download'
import { withDetailQuotationDefaults } from '@/lib/detail-quotation-format'
import { calculateQuotationTotals } from '@/lib/quotation-calculations'
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

function formatMoney(value: number | null | undefined) {
  if (value == null) return '—'
  return `৳ ${Math.round(value).toLocaleString('en-IN')}`
}

function formatAgreementType(value: string | null) {
  if (!value) return 'Confirmed'
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function boqEligible(_lead: AgreementLead) {
  // On the Agreement Leads board, all confirmed agreement leads are eligible for BOQ staff assignment
  return true
}

export function AgreementLeadsBoard({
  title = 'Agreement Leads',
  subtitle = 'Confirmed agreements with quotation totals, discounts, settled values, and detail quotation downloads.',
}: {
  title?: string
  subtitle?: string
}) {
  const [leads, setLeads] = useState<AgreementLead[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [selectedBoq, setSelectedBoq] = useState<Record<string, string>>({})
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [staffLoading, setStaffLoading] = useState(true)
  const [savingBoqId, setSavingBoqId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

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
    try {
      const response = await fetch(`/api/lead/${lead.id}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, department: 'BOQ' }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? 'Failed to assign BOQ staff')
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
      const response = await fetch(
        `/api/lead/${lead.id}/quotation-draft?documentType=detail&slot=1`,
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

  return (
    <div className="min-h-screen bg-background">
      <CrmPageHeader title={title} subtitle={subtitle} />
      <main className="mx-auto max-w-[1600px] px-4 py-6">
        <Card className="mb-4 border-border/70">
          <CardContent className="p-4">
            <div className="relative max-w-xl">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by client name, phone, email, or location…"
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-14">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : leads.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No agreement leads found.
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden border-border/70">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Agreement Type</TableHead>
                  <TableHead className="text-right">Original Quotation Total</TableHead>
                  <TableHead className="text-right">Discount Applied</TableHead>
                  <TableHead className="text-right">Settled Agreement Value</TableHead>
                  <TableHead>SR CRM</TableHead>
                  <TableHead>BOQ Staff</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => {
                  const eligible = boqEligible(lead)
                  const selectedUserId = selectedBoq[lead.id] ?? lead.boqAssignee?.id ?? ''
                  const saving = savingBoqId === lead.id

                  return (
                    <TableRow key={lead.id}>
                      <TableCell className="min-w-[180px]">
                        <div className="font-semibold">{lead.name}</div>
                        {lead.location ? (
                          <div className="mt-1 max-w-[220px] truncate text-xs text-muted-foreground" title={lead.location}>
                            {lead.location}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="min-w-[190px] text-sm">
                        <div>{lead.phone || '—'}</div>
                        <div className="text-xs text-muted-foreground">{lead.email || '—'}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{formatAgreementType(lead.agreementType)}</Badge>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {lead.subStatus?.replace(/_/g, ' ') || lead.stage.replace(/_/g, ' ')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatMoney(lead.originalQuotationTotal)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-amber-700 dark:text-amber-300">{formatMoney(lead.discountApplied)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{formatMoney(lead.settledAgreementValue)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                          {lead.srCrm?.fullName || 'Unassigned'}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[220px]">
                        <div className="mb-1 text-xs text-muted-foreground">
                          {lead.boqAssignee ? `Current: ${lead.boqAssignee.fullName}` : 'Not assigned'}
                        </div>
                        <Select
                          value={selectedUserId}
                          onValueChange={(value) => setSelectedBoq((current) => ({ ...current, [lead.id]: value }))}
                          disabled={!eligible || staffLoading || saving}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select BOQ staff" />
                          </SelectTrigger>
                          <SelectContent>
                            {staff.map((user) => (
                              <SelectItem key={user.id} value={user.id}>{user.fullName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!eligible ? (
                          <div className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                            Requires quotation approved
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="min-w-[250px] text-right">
                        <div className="flex flex-col items-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!eligible || !selectedUserId || saving}
                            onClick={() => void assignBoq(lead)}
                          >
                            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <UserRound className="mr-1.5 h-4 w-4" />}
                            {lead.boqAssignee ? 'Reassign BOQ Staff' : 'Assign BOQ Staff'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!lead.detailQuotationAvailable || downloadingId === lead.id}
                            onClick={() => void downloadDetailQuotation(lead)}
                            title={!lead.detailQuotationAvailable ? 'No detail quotation available' : 'Download Detail Quotation'}
                          >
                            {downloadingId === lead.id ? (
                              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="mr-1.5 h-4 w-4" />
                            )}
                            Download Detail Quotation
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </main>
    </div>
  )
}
