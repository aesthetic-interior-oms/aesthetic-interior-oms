'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { CrmPageHeader } from '@/components/crm/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, FileText, MapPin, User, SquareStack, Download, CheckCircle2 } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { buildDetailPreviewUrl } from '@/lib/detail-quotation-preview-sync'

type QuotationDraft = {
  id: string
  draftKey: string
  quotationType?: string
  grandTotal: number
  status: string
  updatedAt: string
  content: unknown
}

type LeadDetail = {
  id: string
  name: string
  location: string | null
  phone: string | null
  agreementType: string | null
  agreementValue: number | null
  stage: string
  subStatus: string | null
  budget: number | null
  created_at: string
  assignments: Array<{ user: { fullName: string } }>
  quotationDrafts: QuotationDraft[]
}

function draftVersionLabel(draftKey: string, quotationType?: string, index: number = 0): string {
  const typeLabel = quotationType === 'SHORT' ? 'Short' : 'Detail'
  if (draftKey.includes(':slot:')) {
    const slot = draftKey.split(':slot:')[1]
    return `${typeLabel} Version ${slot}`
  }
  return `${typeLabel} Version ${index + 1}`
}

function renderQuotationContent(content: unknown) {
  if (!content || typeof content !== 'object') {
    return <p className="text-muted-foreground text-sm py-4">No items found in quotation.</p>
  }

  const c = content as Record<string, unknown>

  // Summary header details
  const subject = typeof c.summarySubject === 'string' ? c.summarySubject : (typeof c.subject === 'string' ? c.subject : null)
  const discountAmount = typeof c.discountAmount === 'number' ? c.discountAmount : 0
  const discountPercent = typeof c.discountPercent === 'number' ? c.discountPercent : 0
  const grandTotal = typeof c.grandTotal === 'number' ? c.grandTotal : 0

  // 1. DETAIL QUOTATION (has lineItems array)
  if (Array.isArray(c.lineItems) && c.lineItems.length > 0) {
    const rawLines = c.lineItems as Array<{
      id?: string
      description?: string
      quantity?: number
      unit?: string
      rate?: number
      amount?: number
      materials?: string
      sectionId?: string
      areaId?: string
      included?: boolean
    }>

    const includedLines = rawLines.filter((l) => l.included !== false)

    // Sections & Areas map
    const sectionsMap = new Map<string, string>()
    if (Array.isArray(c.sections)) {
      ;(c.sections as Array<{ id: string; name?: string }>).forEach((s) => {
        if (s.id && s.name) sectionsMap.set(s.id, s.name)
      })
    }

    const areasMap = new Map<string, string>()
    if (Array.isArray(c.areas)) {
      ;(c.areas as Array<{ id: string; name?: string }>).forEach((a) => {
        if (a.id && a.name) areasMap.set(a.id, a.name)
      })
    }

    // Group lines by area or section
    const grouped = new Map<string, typeof includedLines>()
    includedLines.forEach((line) => {
      let groupName = 'Quotation Items'
      if (line.areaId && areasMap.has(line.areaId)) {
        groupName = areasMap.get(line.areaId)!
      } else if (line.sectionId && sectionsMap.has(line.sectionId)) {
        groupName = sectionsMap.get(line.sectionId)!
      }
      if (!grouped.has(groupName)) {
        grouped.set(groupName, [])
      }
      grouped.get(groupName)!.push(line)
    })

    return (
      <div className="space-y-6">
        {subject ? (
          <div className="p-3 rounded-md bg-muted/30 border text-xs font-medium text-foreground">
            Subject: {subject}
          </div>
        ) : null}

        {Array.from(grouped.entries()).map(([groupTitle, lines], gi) => (
          <div key={gi} className="space-y-2">
            <h4 className="font-semibold text-sm text-foreground border-b pb-1">
              {groupTitle}
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-muted-foreground border-b">
                    <th className="py-2 pr-4 font-semibold">Item & Specifications</th>
                    <th className="py-2 pr-3 font-semibold text-right w-24">Qty / Area</th>
                    <th className="py-2 pr-3 font-semibold text-right w-24">Rate (৳)</th>
                    <th className="py-2 font-semibold text-right w-28">Total (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {lines.map((line, li) => (
                    <tr key={li} className="align-top hover:bg-muted/20">
                      <td className="py-2.5 pr-4">
                        <div className="font-medium text-foreground">
                          {line.description || 'Custom Item'}
                        </div>
                        {line.materials ? (
                          <div className="mt-1 text-xs text-muted-foreground whitespace-pre-line bg-muted/20 p-2 rounded border border-border/30">
                            {line.materials}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">
                        {line.quantity != null ? `${line.quantity} ${line.unit ?? ''}` : '—'}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">
                        {line.rate != null ? `৳${line.rate.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-2.5 text-right tabular-nums font-semibold">
                        {line.amount != null ? `৳${line.amount.toLocaleString()}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Totals Summary */}
        <div className="flex flex-col items-end border-t pt-4 space-y-1 text-sm">
          {discountAmount > 0 ? (
            <div className="flex justify-between w-64 text-xs text-muted-foreground">
              <span>Discount ({discountPercent > 0 ? `${discountPercent}%` : 'Fixed'}):</span>
              <span>- ৳{discountAmount.toLocaleString()}</span>
            </div>
          ) : null}
          <div className="flex justify-between w-64 font-bold text-base pt-1 text-foreground">
            <span>Grand Total:</span>
            <span>৳{grandTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>
    )
  }

  // 2. SHORT QUOTATION (has roomCards array)
  const roomCards = Array.isArray(c.roomCards)
    ? (c.roomCards as Array<{
        roomName?: string
        name?: string
        items?: Array<{
          name?: string
          title?: string
          description?: string
          workDescription?: string
          materials?: string
          unit?: string
          quantity?: number
          qty?: number
          area?: number
          totalPrice?: number
          total?: number
          amount?: number
          unitPrice?: number
          rate?: number
        }>
      }>)
    : []

  if (roomCards.length > 0) {
    return (
      <div className="space-y-6">
        {subject ? (
          <div className="p-3 rounded-md bg-muted/30 border text-xs font-medium text-foreground">
            Subject: {subject}
          </div>
        ) : null}

        {roomCards.map((room, ri) => (
          <div key={ri} className="space-y-2">
            <h4 className="font-semibold text-sm text-foreground border-b pb-1">
              {room.roomName || room.name || `Room ${ri + 1}`}
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-muted-foreground border-b">
                    <th className="py-2 pr-4 font-semibold">Item & Work Details</th>
                    <th className="py-2 pr-3 font-semibold text-right w-24">Qty / Area</th>
                    <th className="py-2 pr-3 font-semibold text-right w-24">Rate (৳)</th>
                    <th className="py-2 font-semibold text-right w-28">Total (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {(room.items ?? []).map((item, ii) => {
                    const itemName = item.name || item.title || item.description || 'Item'
                    const workDesc = item.workDescription || item.materials || (item.name && item.description ? item.description : null)
                    const qty = item.quantity ?? item.qty ?? item.area
                    const rate = item.unitPrice ?? item.rate
                    const itemTotal = item.totalPrice ?? item.total ?? item.amount

                    return (
                      <tr key={ii} className="align-top hover:bg-muted/20">
                        <td className="py-2.5 pr-4">
                          <div className="font-medium text-foreground">{itemName}</div>
                          {workDesc ? (
                            <div className="mt-1 text-xs text-muted-foreground whitespace-pre-line bg-muted/20 p-2 rounded border border-border/30">
                              {workDesc}
                            </div>
                          ) : null}
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">
                          {qty != null ? `${qty} ${item.unit ?? ''}` : '—'}
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">
                          {rate != null ? `৳${rate.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-2.5 text-right tabular-nums font-semibold">
                          {itemTotal != null ? `৳${itemTotal.toLocaleString()}` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Totals Summary */}
        <div className="flex flex-col items-end border-t pt-4 space-y-1 text-sm">
          {discountAmount > 0 ? (
            <div className="flex justify-between w-64 text-xs text-muted-foreground">
              <span>Discount ({discountPercent > 0 ? `${discountPercent}%` : 'Fixed'}):</span>
              <span>- ৳{discountAmount.toLocaleString()}</span>
            </div>
          ) : null}
          <div className="flex justify-between w-64 font-bold text-base pt-1 text-foreground">
            <span>Grand Total:</span>
            <span>৳{grandTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>
    )
  }

  // Fallback
  return (
    <div className="space-y-4">
      {subject ? (
        <div className="p-3 rounded-md bg-muted/30 border text-xs font-medium text-foreground">
          Subject: {subject}
        </div>
      ) : null}
      <p className="text-muted-foreground text-sm py-2">
        Quotation saved. Grand Total: <span className="font-semibold text-foreground">৳{grandTotal.toLocaleString()}</span>
      </p>
    </div>
  )
}

export default function PCProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const [lead, setLead] = useState<LeadDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null)

  useEffect(() => {
    if (!params.id) return
    fetch(`/api/pc/projects/${params.id}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then(
        (data: { success: boolean; data?: LeadDetail; error?: string }) => {
          if (data.success && data.data) {
            setLead(data.data)
            if (data.data.quotationDrafts.length > 0) {
              setSelectedDraftId(data.data.quotationDrafts[0].id)
            }
          } else {
            toast.error(data.error ?? 'Failed to load project')
          }
        },
      )
      .catch(() => toast.error('Failed to load project'))
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <CrmPageHeader title="Project Detail" subtitle="" />
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="flex flex-col min-h-screen">
        <CrmPageHeader title="Project Detail" subtitle="" />
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          Project not found.
        </div>
      </div>
    )
  }

  const selectedDraft =
    lead.quotationDrafts.find((d) => d.id === selectedDraftId) ?? lead.quotationDrafts[0] ?? null

  return (
    <div className="flex flex-col min-h-screen">
      <CrmPageHeader
        title={lead.name}
        subtitle="Project details and quotation overview."
      />
      <div className="flex flex-col gap-6 p-4 md:gap-8 md:p-8 w-full flex-1">

        {/* Lead Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Project Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="font-medium">{lead.location ?? 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Sr. CRM</p>
                  <p className="font-medium">
                    {lead.assignments[0]?.user?.fullName ?? 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <SquareStack className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Stage</p>
                  <Badge variant="outline" className="font-normal mt-0.5">
                    {lead.stage.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Agreement Type</p>
                <p className="font-medium">
                  {(lead.agreementType ?? 'N/A').replace(/_/g, ' ')}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Agreement Value
                </p>
                <p className="font-medium tabular-nums">
                  {lead.agreementValue != null
                    ? `৳${lead.agreementValue.toLocaleString()}`
                    : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quotation Section */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Quotation Breakdown</CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {lead.quotationDrafts.length > 1 && (
                  <div className="flex flex-wrap gap-2">
                    {lead.quotationDrafts.map((draft, idx) => (
                      <button
                        key={draft.id}
                        onClick={() => setSelectedDraftId(draft.id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          selectedDraftId === draft.id
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border bg-muted/40 hover:bg-muted'
                        }`}
                      >
                        {draftVersionLabel(draft.draftKey, draft.quotationType, idx)}
                        {' — '}
                        ৳{draft.grandTotal.toLocaleString()}
                      </button>
                    ))}
                  </div>
                )}
                {selectedDraft ? (
                  <Link
                    href={buildDetailPreviewUrl({ context: 'lead', contextId: lead.id })}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Open PDF Preview
                  </Link>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {lead.quotationDrafts.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">
                No quotation available for this project.
              </p>
            ) : selectedDraft ? (
              <div>
                <div className="flex justify-between items-center mb-4 text-sm bg-muted/20 p-3 rounded-md border">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      Draft: <strong className="text-foreground">{draftVersionLabel(selectedDraft.draftKey, selectedDraft.quotationType)}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Updated: {new Date(selectedDraft.updatedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <span className="font-bold tabular-nums text-base text-foreground">
                    Total: ৳{selectedDraft.grandTotal.toLocaleString()}
                  </span>
                </div>
                {renderQuotationContent(selectedDraft.content)}
              </div>
            ) : null}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
