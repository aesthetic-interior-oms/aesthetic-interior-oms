'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, FileText, Loader2, Search, UserRound } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { CrmPageHeader } from '@/components/crm/shared/page-header'
import { DetailQuotationDocument } from '@/components/crm/quotation/pdf/DetailQuotationDocument'
import { downloadPdfFromDocument } from '@/components/crm/quotation/pdf/pdf-download'
import { withDetailQuotationDefaults } from '@/lib/detail-quotation-format'
import { calculateQuotationTotals } from '@/lib/quotation-calculations'
import type { QuotationFileType } from '@/lib/quotation-types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type AgreementLead = {
  id: string
  name: string
  phone: string | null
  email: string | null
  location: string | null
  stage: string
  subStatus: string | null
  agreementType: string | null
  originalQuotationTotal: number
  discountApplied: number
  settledAgreementValue: number | null
  updatedAt: string
  detailQuotationAvailable: boolean
  srCrm: { id: string; fullName: string; email: string } | null
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
  return value.replace(/_/g, ' ').toLowerCase().replace(/\\b\\w/g, (c) => c.toUpperCase())
}

export function AgreementLeadsBoard({
  title = 'Agreement Leads',
  subtitle = 'Confirmed agreements with quotation totals, discounts, settled values, and detail quotation downloads.',
}: {
  title?: string
  subtitle?: string
}) {
  const [leads, setLeads] = useState<AgreementLead[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
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
      setLeads(payload.data ?? [])
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
      if (!source?.content) {
        throw new Error('No detail quotation is available for this lead')
      }

      const content = withDetailQuotationDefaults(source.content)
      const totals = calculateQuotationTotals(content)
      const quotationType = (
        source.quotationType === 'BASIC' ||
        source.quotationType === 'STANDARD' ||
        source.quotationType === 'PREMIUM' ||
        source.quotationType === 'MIXED' ||
        source.quotationType === 'PLATINUM' ||
        source.quotationType === 'LUXURY'
      ) ? source.quotationType as QuotationFileType : 'STANDARD'

      const downloadedAt = new Date().toISOString()
      const quotationCode = `DQ-AGR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${lead.id.slice(-6).toUpperCase()}`
      const contentForDownload = {
        ...content,
        quotationCode,
        downloadedAt,
      }

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

      void quotationType
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
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
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
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatMoney(lead.originalQuotationTotal)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-amber-700 dark:text-amber-300">
                      {formatMoney(lead.discountApplied)}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                      {formatMoney(lead.settledAgreementValue)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                        {lead.srCrm?.fullName || 'Unassigned'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </main>
    </div>
  )
}
