'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { CrmPageHeader } from '@/components/crm/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, FileText, MapPin, User, SquareStack } from 'lucide-react'
import { toast } from '@/components/ui/sonner'

type QuotationItem = {
  name?: string
  description?: string
  quantity?: number
  area?: number
  unit?: string
  total?: number
}

type QuotationSection = {
  sectionTitle?: string
  items?: QuotationItem[]
}

type QuotationDraft = {
  id: string
  draftKey: string
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

function draftVersionLabel(draftKey: string, index: number): string {
  if (draftKey.includes(':slot:')) {
    const slot = draftKey.split(':slot:')[1]
    return `Version ${slot}`
  }
  return `Version ${index + 1}`
}

function renderQuotationContent(content: unknown) {
  if (!content || typeof content !== 'object') {
    return (
      <p className="text-muted-foreground text-sm">
        No items found in quotation.
      </p>
    )
  }

  const c = content as Record<string, unknown>
  let sections: QuotationSection[] = []

  if (Array.isArray(c.sections)) {
    sections = c.sections as QuotationSection[]
  } else if (Array.isArray(c.items)) {
    // flat items — wrap in a single section
    sections = [{ items: c.items as QuotationItem[] }]
  }

  if (sections.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No items found in quotation.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {sections.map((section, si) => (
        <div key={si}>
          {section.sectionTitle && (
            <h4 className="font-semibold text-sm mb-2 border-b pb-1">
              {section.sectionTitle}
            </h4>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="py-1 pr-4 font-medium">Item</th>
                <th className="py-1 pr-3 font-medium text-right">Qty</th>
                <th className="py-1 pr-3 font-medium text-right">Area</th>
                <th className="py-1 pr-3 font-medium text-right">Unit</th>
                <th className="py-1 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(section.items) &&
                section.items.map((item, ii) => (
                  <tr key={ii} className="border-b border-border/40">
                    <td className="py-2 pr-4">
                      <div className="font-medium">
                        {item.name ?? item.description ?? '—'}
                      </div>
                      {item.description && item.name && (
                        <div className="text-xs text-muted-foreground">
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {item.quantity ?? '—'}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {item.area != null ? `${item.area} sqft` : '—'}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      {item.unit ?? '—'}
                    </td>
                    <td className="py-2 text-right tabular-nums font-medium">
                      {item.total != null
                        ? `৳${item.total.toLocaleString()}`
                        : '—'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
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
    lead.quotationDrafts.find((d) => d.id === selectedDraftId) ?? null

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

        {/* Quotation */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Quotation</CardTitle>
              </div>
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
                      {draftVersionLabel(draft.draftKey, idx)}
                      {' — '}
                      ৳{draft.grandTotal.toLocaleString()}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {lead.quotationDrafts.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No quotation available for this project.
              </p>
            ) : selectedDraft ? (
              <div>
                <div className="flex justify-between items-center mb-4 text-sm">
                  <span className="text-muted-foreground">
                    Last updated:{' '}
                    {new Date(selectedDraft.updatedAt).toLocaleDateString(
                      'en-US',
                      {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      },
                    )}
                  </span>
                  <span className="font-semibold tabular-nums text-base">
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
