'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { CrmPageHeader } from '@/components/crm/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { QuotationWorkspace } from '@/components/crm/quotation/quotation-workspace'
import { buildDetailPreviewUrl } from '@/lib/detail-quotation-preview-sync'

type LeadDetail = {
  id: string
  name: string
  stage: string
  subStatus: string | null
  location: string | null
  phone: string | null
  meetingEvents?: Array<{
    id: string
    title: string
    type: string
    notes: string | null
    startsAt: string
  }>
  attachments?: Array<{
    id: string
    url: string
    fileName: string
    fileType: string
    category: string
    createdAt: string
  }>
}

export default function SrCrmQuotationWorkspacePage() {
  const params = useParams<{ id: string }>()
  const leadId = params?.id
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lead, setLead] = useState<LeadDetail | null>(null)

  useEffect(() => {
    const loadLead = async () => {
      if (!leadId) return
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/lead/${leadId}`, { cache: 'no-store' })
        const payload = await response.json()
        if (!response.ok || !payload?.success || !payload?.data) {
          throw new Error(payload?.error ?? 'Failed to load lead')
        }
        setLead(payload.data as LeadDetail)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load lead')
        setLead(null)
      } finally {
        setLoading(false)
      }
    }

    void loadLead()
  }, [leadId])

  return (
    <div className="min-h-screen bg-background">
      <CrmPageHeader
        title={lead ? `${lead.name} - Quotation Workspace` : 'Quotation Workspace'}
        subtitle="Senior CRM Quotation Workspace."
      />

      <main className="mx-auto max-w-[1440px] px-6 py-6 space-y-4">
        {loading ? (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">Loading lead...</CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="py-8 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : lead ? (
          <>
            <Card>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">Detail quotation PDF</p>
                  <p className="text-xs text-muted-foreground">Open the PDF preview, then click Download PDF to save this lead's detail quotation.</p>
                </div>
                <Link
                  href={buildDetailPreviewUrl({ context: 'lead', contextId: lead.id })}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-fit items-center justify-center rounded-md border bg-white px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Download detail PDF
                </Link>
              </CardContent>
            </Card>

            <QuotationWorkspace
              leadId={lead.id}
              leadName={lead.name}
              leadLocation={lead.location}
              leadSubStatus={lead.subStatus}
            />

            <details className="rounded-lg border bg-card">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
                Lead context (meetings & files)
              </summary>
              <div className="space-y-4 border-t px-4 py-4">
                <Card className="shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">Lead Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p><span className="font-medium">Name:</span> {lead.name}</p>
                    <p><span className="font-medium">Phone:</span> {lead.phone ?? 'N/A'}</p>
                    <p><span className="font-medium">Location:</span> {lead.location ?? 'N/A'}</p>
                    <p><span className="font-medium">Stage:</span> {lead.stage}</p>
                    <p><span className="font-medium">Sub-status:</span> {lead.subStatus ?? 'N/A'}</p>
                  </CardContent>
                </Card>

                <Card className="shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">Meeting History</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(lead.meetingEvents ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No meeting events found for this lead.</p>
                    ) : (
                      (lead.meetingEvents ?? []).map((meeting) => (
                        <div key={meeting.id} className="rounded-md border p-3 text-sm">
                          <p className="font-medium">{meeting.title}</p>
                          <p className="text-muted-foreground">
                            {meeting.type.replace(/_/g, ' ')} • {new Date(meeting.startsAt).toLocaleString()}
                          </p>
                          <p className="mt-2 whitespace-pre-wrap">{meeting.notes ?? 'No notes'}</p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">Uploaded Files</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(lead.attachments ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No files uploaded yet for this lead.</p>
                    ) : (
                      (lead.attachments ?? []).map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex flex-col gap-2 rounded-md border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">{attachment.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {attachment.category} • {attachment.fileType} •{' '}
                              {new Date(attachment.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex w-fit items-center rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                          >
                            View File
                          </a>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </details>
          </>
        ) : null}
      </main>
    </div>
  )
}
