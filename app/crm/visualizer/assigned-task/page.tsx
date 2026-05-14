'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Download,
  FileText,
  Loader2,
  MapPin,
  Phone,
  UserRound,
} from 'lucide-react'
import { CrmPageHeader } from '@/components/crm/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from '@/components/ui/sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type VisualizerTaskLead = {
  id: string
  name: string
  phone: string | null
  location: string | null
  stage: string
  subStatus: string | null
  updatedAt: string
  budget: number | null
  visualizerAssignee: { id: string; fullName: string; email: string } | null
  attachments?: Array<{
    id: string
    fileName: string
    url: string
    fileType: string | null
  }>
  canStart: boolean
  canOpenWorkspace: boolean
}

function formatLabel(value: string | null | undefined) {
  if (!value) return 'N/A'
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export default function VisualizerAssignedTaskPage() {
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [leads, setLeads] = useState<VisualizerTaskLead[]>([])
  const [startWorkLead, setStartWorkLead] = useState<VisualizerTaskLead | null>(null)

  const loadTasks = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/visualizer/assigned-tasks', {
        cache: 'no-store',
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success || !Array.isArray(payload.data)) {
        throw new Error(
          payload?.error ?? 'Failed to load assigned visualization tasks',
        )
      }
      setLeads(payload.data as VisualizerTaskLead[])
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to load assigned visualization tasks',
      )
      setLeads([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTasks()
  }, [loadTasks])

  const summary = useMemo(
    () => ({
      total: leads.length,
      assigned: leads.filter((lead) => lead.subStatus === 'VISUAL_ASSIGNED')
        .length,
      working: leads.filter((lead) => lead.subStatus === 'VISUAL_WORKING')
        .length,
      corrections: leads.filter(
        (lead) => lead.subStatus === 'VISUAL_CORRECTION',
      ).length,
    }),
    [leads],
  )

  const startWork = async () => {
    if (!startWorkLead) return
    setBusyId(startWorkLead.id)
    try {
      const response = await fetch(
        `/api/lead/${startWorkLead.id}/visualizer-work/start`,
        { method: 'POST' },
      )
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Failed to start visualization work')
      }
      toast.success('Visualization work started')
      setStartWorkLead(null)
      await loadTasks()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to start visualization work',
      )
    } finally {
      setBusyId(null)
    }
  }

  const canShowAttachments = (lead: VisualizerTaskLead) =>
    lead.subStatus === 'VISUAL_WORKING' || lead.subStatus === 'VISUAL_COMPLETED'

  return (
    <div className="min-h-screen bg-background">
      <CrmPageHeader
        title="Assigned Task"
        subtitle="3D visualization assignments sent from completed budget meetings. Start work to unlock lead attachments."
      />

      <main className="mx-auto max-w-[1440px] space-y-4 px-6 py-6">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Total: {summary.total}</Badge>
          <Badge variant="secondary">Assigned: {summary.assigned}</Badge>
          <Badge variant="secondary">Working: {summary.working}</Badge>
          <Badge variant="secondary">Corrections: {summary.corrections}</Badge>
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-lg border border-border bg-card py-14">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : leads.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No visualization tasks assigned yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {leads.map((lead) => (
              <Card
                key={lead.id}
                className="overflow-hidden border-border/70 shadow-sm transition hover:border-primary/40 hover:shadow-md"
              >
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <Link
                        href={`/crm/visualizer/leads/${lead.id}`}
                        className="text-base font-semibold hover:text-primary hover:underline"
                      >
                        {lead.name}
                      </Link>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">
                          {formatLabel(lead.stage)}
                        </Badge>
                        <Badge variant="outline">
                          {formatLabel(lead.subStatus)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {lead.canOpenWorkspace ? (
                        <Button asChild size="sm">
                          <Link href={`/crm/visualizer/leads/${lead.id}`}>
                            Submit Data
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === lead.id || !lead.canStart}
                          onClick={() => setStartWorkLead(lead)}
                        >
                          {busyId === lead.id ? (
                            <>
                              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                              Starting...
                            </>
                          ) : (
                            'Start Work'
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                    <p className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {lead.phone || 'No phone'}
                    </p>
                    <p className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {lead.location || 'No location'}
                    </p>
                    <p className="inline-flex items-center gap-1 md:col-span-2">
                      <UserRound className="h-3.5 w-3.5" />
                      3D Visualizer:{' '}
                      {lead.visualizerAssignee?.fullName ?? 'Unassigned'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Attachments
                    </p>
                    {canShowAttachments(lead) ? (
                      (lead.attachments?.length ?? 0) > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {(lead.attachments ?? []).map((attachment) => (
                            <a
                              key={attachment.id}
                              href={attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-md border border-border/60 bg-card px-3 py-2 text-xs text-foreground transition hover:border-primary/40 hover:bg-secondary/30"
                              title={attachment.fileName}
                            >
                              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="max-w-[220px] truncate">
                                {attachment.fileName}
                              </span>
                              <Download className="h-3.5 w-3.5 text-primary" />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-md border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground">
                          No attachments available for this lead.
                        </div>
                      )
                    ) : (
                      <div className="rounded-md border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground">
                        Attachments will be visible after you start the work.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog
        open={Boolean(startWorkLead)}
        onOpenChange={(open) => {
          if (busyId) return
          if (!open) setStartWorkLead(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start 3D Visualization Work?</DialogTitle>
            <DialogDescription>
              {startWorkLead
                ? `Confirm starting work for ${startWorkLead.name}. This will update the lead substatus to Visual Working and unlock its attachments.`
                : 'This action will update the lead substatus to Visual Working and unlock its attachments.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStartWorkLead(null)}
              disabled={Boolean(busyId)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={startWork} disabled={Boolean(busyId) || !startWorkLead}>
              {busyId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Yes, Start Work'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
