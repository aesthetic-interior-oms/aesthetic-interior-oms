"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, FileText, Loader2, MapPin, UserRound, Sparkles, ClipboardList, PenTool, CheckCircle, RotateCcw, CalendarClock } from "lucide-react";
import { CrmPageHeader } from "@/components/crm/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { uploadDirectBlobFile, type UploadedBlobFileMeta } from "@/lib/client-blob-upload";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TaskLead = {
  id: string;
  name: string;
  phone: string | null;
  location: string | null;
  stage: string;
  subStatus: string | null;
  updatedAt: string;
  latestFirstMeeting: {
    id: string;
    title: string;
    notes: string | null;
    startsAt: string;
  } | null;
  srCrmAssignee: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  jrArchitectAssignee: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  projectSqft: number | null;
  avgDetailSqft?: number;
  avgShortSqft?: number;
  detailVersionsCount?: number;
  shortPackagesCount?: number;
  canStart: boolean;
  canSubmit: boolean;
  attachments?: Array<{
    id: string;
    fileName: string;
    url: string;
    fileType: string | null;
  }>;
};

function formatLabel(value: string | null | undefined) {
  if (!value) return "N/A";
  if (value === "DISCOVERY") return "Consulting Phase";
  if (value === "PROPOSAL_SENT") return "Quotation Sent";
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function QuotationAssignedTaskPage() {
  type QuotationPackageType = "PREMIUM" | "STANDARD" | "BASIC" | "MIXED";
  type AttachmentDocumentType = "SHORT" | "DETAIL";
  type AttachmentInput = {
    id: string;
    file: File | null;
    documentType: AttachmentDocumentType;
    packageType: QuotationPackageType;
  };
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [leads, setLeads] = useState<TaskLead[]>([]);
  const [submitLead, setSubmitLead] = useState<TaskLead | null>(null);
  const [submitNote, setSubmitNote] = useState("");
  const [submitAttachments, setSubmitAttachments] = useState<AttachmentInput[]>([
    { id: crypto.randomUUID(), file: null, documentType: "SHORT", packageType: "PREMIUM" },
  ]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  function createEmptyAttachment(): AttachmentInput {
    return { id: crypto.randomUUID(), file: null, documentType: "SHORT", packageType: "PREMIUM" };
  }

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/quotation/assigned-tasks", {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success || !Array.isArray(payload.data)) {
        throw new Error(payload?.error ?? "Failed to load assigned tasks");
      }
      setLeads(payload.data as TaskLead[]);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load assigned tasks",
      );
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const summary = useMemo(
    () => ({
      total: leads.length,
      assigned: leads.filter((lead) => lead.subStatus === "QUOTATION_ASSIGNED").length,
      working: leads.filter((lead) => lead.subStatus === "QUOTATION_WORKING").length,
      completed: leads.filter((lead) => lead.subStatus === "QUOTATION_COMPLETED").length,
      corrections: leads.filter((lead) => lead.subStatus === "QUOTATION_CORRECTION").length,
      totalDetailSqft: leads.reduce((sum, l) => sum + (l.avgDetailSqft ?? 0), 0),
      totalShortSqft: leads.reduce((sum, l) => sum + (l.avgShortSqft ?? 0), 0),
    }),
    [leads],
  );


  const canShowLeadAttachments = (lead: TaskLead) =>
    lead.subStatus === "QUOTATION_WORKING" ||
    lead.subStatus === "QUOTATION_COMPLETED" ||
    lead.subStatus === "QUOTATION_APPROVED";

  const startQuotationWork = async (leadId: string) => {
    setBusyId(leadId);
    try {
      const response = await fetch(`/api/lead/${leadId}/quotation-work/start`, {
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? "Failed to start quotation work");
      }
      toast.success("Quotation work started");
      await loadTasks();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to start quotation work",
      );
    } finally {
      setBusyId(null);
    }
  };

  const openSubmitDialog = (lead: TaskLead) => {
    setSubmitLead(lead);
    setSubmitNote("");
    setSubmitAttachments([{ id: crypto.randomUUID(), file: null, documentType: "SHORT", packageType: "PREMIUM" }]);
  };

  const submitQuotationWork = async () => {
    if (!submitLead) return;
    const validAttachments = submitAttachments.filter((item) => item.file);
    if (validAttachments.length === 0) {
      toast.error("Please add at least one attachment");
      return;
    }
    const invalidFiles = validAttachments.filter((item) => item.file?.type && item.file.type !== "application/pdf");
    if (invalidFiles.length > 0) {
      toast.error("Please upload PDF files only for quotation submissions");
      return;
    }
    setBusyId(submitLead.id);
    try {
      setUploadingFiles(true);
      const uploadedFiles: UploadedBlobFileMeta[] = [];
      for (const attachment of validAttachments) {
        const file = attachment.file;
        if (!file) continue;
        const quotationFileType = attachment.documentType === "SHORT" ? attachment.packageType : "DETAIL";
        const uploaded = await uploadDirectBlobFile({
          file,
          context: "quotation-work",
          ownerId: submitLead.id,
          quotationFileType,
        });
        uploadedFiles.push({
          ...uploaded,
          fileName:
            attachment.documentType === "SHORT"
              ? `[Short - ${attachment.packageType}] ${uploaded.fileName}`
              : `[Detail] ${uploaded.fileName}`,
        });
      }
      const shortPackages = validAttachments
        .filter((item) => item.documentType === "SHORT")
        .map((item) => item.packageType);
      const distinctPackages = [...new Set(shortPackages)];
      const finalQuotationType: QuotationPackageType | undefined =
        distinctPackages.length === 0 ? undefined : distinctPackages.length > 1 ? "MIXED" : distinctPackages[0];
      setUploadingFiles(false);
      const response = await fetch(
        `/api/lead/${submitLead.id}/quotation-work/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            note: submitNote.trim() || undefined,
            quotationType: finalQuotationType,
            files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? "Failed to submit quotation work");
      }
      toast.success("Quotation submitted to Senior CRM Review Center");
      setSubmitLead(null);
      setSubmitNote("");
      setSubmitAttachments([{ id: crypto.randomUUID(), file: null, documentType: "SHORT", packageType: "PREMIUM" }]);
      await loadTasks();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to submit quotation work",
      );
    } finally {
      setUploadingFiles(false);
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <CrmPageHeader
        title="Assigned Task"
        subtitle="Assigned quotation leads. Start work and submit using the same flow style as Jr Architecture."
      />

      <main className="mx-auto max-w-[1440px] px-6 py-6 space-y-4">
        <div className="rounded-[1.35rem] border border-border/70 bg-gradient-to-br from-background via-muted/20 to-background p-3 shadow-sm mb-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Assigned Task Metrics
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Overview of your quotation tasks and their current phases.
              </p>
            </div>
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
              Live tracking
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {[
              { key: 'total', label: 'Total Assigned', value: summary.total, isSqft: false, Icon: ClipboardList, className: 'border-slate-200/80 from-slate-900 via-slate-800 to-slate-950 text-white dark:border-white/10 dark:from-slate-100 dark:via-white dark:to-slate-200 dark:text-slate-950', iconClass: 'bg-white/15 text-white ring-white/25 dark:bg-slate-950/10 dark:text-slate-950 dark:ring-slate-950/15', accentClass: 'from-primary to-blue-400' },
              { key: 'assigned', label: 'Assigned', value: summary.assigned, isSqft: false, Icon: UserRound, className: 'border-blue-200/70 from-blue-50 via-white to-sky-50 text-blue-800 dark:border-blue-500/30 dark:from-blue-950/60 dark:via-slate-950 dark:to-sky-950/40 dark:text-blue-100', iconClass: 'bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-200 dark:ring-blue-400/20', accentClass: 'from-blue-500 to-sky-500' },
              { key: 'working', label: 'Working', value: summary.working, isSqft: false, Icon: PenTool, className: 'border-amber-200/70 from-amber-50 via-white to-orange-50 text-amber-800 dark:border-amber-500/30 dark:from-amber-950/60 dark:via-slate-950 dark:to-orange-950/40 dark:text-amber-100', iconClass: 'bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-400/20', accentClass: 'from-amber-500 to-orange-500' },
              { key: 'completed', label: 'Completed', value: summary.completed, isSqft: false, Icon: CheckCircle, className: 'border-emerald-200/70 from-emerald-50 via-white to-teal-50 text-emerald-800 dark:border-emerald-500/30 dark:from-emerald-950/60 dark:via-slate-950 dark:to-teal-950/40 dark:text-emerald-100', iconClass: 'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20', accentClass: 'from-emerald-500 to-teal-500' },
              { key: 'corrections', label: 'Corrections', value: summary.corrections, isSqft: false, Icon: RotateCcw, className: 'border-rose-200/70 from-rose-50 via-white to-pink-50 text-rose-800 dark:border-rose-500/30 dark:from-rose-950/60 dark:via-slate-950 dark:to-pink-950/40 dark:text-rose-100', iconClass: 'bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-rose-400/20', accentClass: 'from-rose-500 to-pink-500' },
              { key: 'detailSqft', label: 'Detail SQFT', value: summary.totalDetailSqft, isSqft: true, Icon: Sparkles, className: 'border-purple-200/70 from-purple-50 via-white to-indigo-50 text-purple-900 dark:border-purple-500/30 dark:from-purple-950/60 dark:via-slate-950 dark:to-indigo-950/40 dark:text-purple-100', iconClass: 'bg-purple-100 text-purple-700 ring-purple-200 dark:bg-purple-500/15 dark:text-purple-200 dark:ring-purple-400/20', accentClass: 'from-purple-500 to-indigo-500' },
              { key: 'shortSqft', label: 'Short SQFT', value: summary.totalShortSqft, isSqft: true, Icon: Sparkles, className: 'border-cyan-200/70 from-cyan-50 via-white to-sky-50 text-cyan-900 dark:border-cyan-500/30 dark:from-cyan-950/60 dark:via-slate-950 dark:to-sky-950/40 dark:text-cyan-100', iconClass: 'bg-cyan-100 text-cyan-700 ring-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-200 dark:ring-cyan-400/20', accentClass: 'from-cyan-500 to-sky-500' },
            ].map((stat) => {
              const percentage = summary.total > 0 && !stat.isSqft ? Math.round((Number(stat.value) / summary.total) * 100) : 0;
              return (
                <div
                  key={stat.key}
                  className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-3.5 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl ${stat.className}`}
                >
                  <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/30 blur-2xl transition group-hover:scale-125 dark:bg-white/10" />
                  <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${stat.accentClass}`} />

                  <div className="relative flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] opacity-80">
                        {stat.label}
                      </p>
                      <div className="mt-2.5 flex items-end gap-1.5">
                        <p className="text-2xl font-black leading-none tracking-tight">
                          {stat.isSqft ? Number(stat.value).toLocaleString() : stat.value}
                        </p>
                        {!stat.isSqft ? (
                          <span className="mb-0.5 rounded-full bg-white/45 px-1.5 py-0.5 text-[9px] font-bold shadow-sm ring-1 ring-black/5 dark:bg-black/15 dark:ring-white/10">
                            {percentage}%
                          </span>
                        ) : (
                          <span className="mb-0.5 text-[10px] font-bold opacity-75">sqft</span>
                        )}
                      </div>
                    </div>
                    <span className={`rounded-xl p-2 shadow-sm ring-1 ${stat.iconClass}`}>
                      <stat.Icon className="h-4 w-4" />
                    </span>
                  </div>

                  {!stat.isSqft ? (
                    <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
                      <span
                        className={`block h-full rounded-full bg-gradient-to-r ${stat.accentClass} transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-lg border border-border bg-card py-14">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : leads.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No quotation tasks assigned yet.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-end border-b border-border/40 pb-4">
              <div className="flex items-center gap-2 rounded-md border p-1 bg-muted/20">
                <Button
                  variant={viewMode === "card" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={() => setViewMode("card")}
                >
                  Card View
                </Button>
                <Button
                  variant={viewMode === "table" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={() => setViewMode("table")}
                >
                  Table View
                </Button>
              </div>
            </div>

            {viewMode === "table" ? (
              <div className="rounded-md border bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Lead Name</th>
                        <th className="px-4 py-3 font-medium">Stage / Status</th>
                        <th className="px-4 py-3 font-medium">Location & Sqft</th>
                        <th className="px-4 py-3 font-medium">Visit Date</th>
                        <th className="px-4 py-3 font-medium">Assignees</th>
                        <th className="px-4 py-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {leads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <Link href={`/quotation-team/leads/${lead.id}`} className="font-semibold hover:text-primary hover:underline">{lead.name}</Link>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1 items-start">
                              <Badge variant="secondary" className="text-[10px]">{formatLabel(lead.stage)}</Badge>
                              <Badge variant="outline" className="text-[10px]">{formatLabel(lead.subStatus)}</Badge>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="max-w-[150px] truncate" title={lead.location ?? ""}>{lead.location ?? "—"}</div>
                            <div className="flex flex-col text-[11px] text-muted-foreground mt-1 space-y-0.5">
                              <span className="inline-flex items-center gap-1">
                                <span className="font-semibold text-cyan-700 dark:text-cyan-400">Short SQFT:</span> {lead.avgShortSqft ? `${lead.avgShortSqft.toLocaleString()}` : "0"}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <span className="font-semibold text-purple-700 dark:text-purple-400">Detail SQFT:</span> {lead.avgDetailSqft ? `${lead.avgDetailSqft.toLocaleString()}` : "0"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {lead.latestFirstMeeting?.startsAt ? new Date(lead.latestFirstMeeting.startsAt).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' }) : "Not set"}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <div className="flex flex-col gap-1">
                              {lead.srCrmAssignee ? <span>SR: {lead.srCrmAssignee.fullName}</span> : <span className="text-muted-foreground">SR: Unassigned</span>}
                              {lead.jrArchitectAssignee ? <span>JR: {lead.jrArchitectAssignee.fullName}</span> : <span className="text-muted-foreground">JR: Unassigned</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              {lead.subStatus === "QUOTATION_WORKING" || lead.subStatus === "QUOTATION_CORRECTION" ? (
                                <Button asChild size="sm" variant="ghost" className="h-8 px-2 text-xs">
                                  <Link href={`/quotation-team/leads/${lead.id}`}>Work</Link>
                                </Button>
                              ) : null}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-xs"
                                disabled={busyId === lead.id || !lead.canStart}
                                onClick={() => startQuotationWork(lead.id)}
                              >
                                Start
                              </Button>
                              <Button
                                size="sm"
                                className="h-8 px-2 text-xs"
                                disabled={busyId === lead.id || !lead.canSubmit}
                                onClick={() => openSubmitDialog(lead)}
                              >
                                Submit
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
          <div className="space-y-3">
            {leads.map((lead) => (
              <Card
                key={lead.id}
                className={`overflow-hidden shadow-sm transition hover:shadow-md border ${
                  lead.subStatus === "QUOTATION_WORKING" || lead.subStatus === "QUOTATION_CORRECTION"
                    ? "border-amber-300/80 bg-gradient-to-br from-amber-100/60 to-orange-50/40 dark:border-amber-700/50 dark:from-amber-900/40 dark:to-orange-900/20"
                    : lead.subStatus === "QUOTATION_COMPLETED"
                    ? "border-emerald-300/80 bg-gradient-to-br from-emerald-100/60 to-teal-50/40 dark:border-emerald-700/50 dark:from-emerald-900/40 dark:to-teal-900/20"
                    : "border-border/70 hover:border-primary/40"
                }`}
              >
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <Link
                        href={`/quotation-team/leads/${lead.id}`}
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
                      {lead.subStatus === "QUOTATION_WORKING" ||
                      lead.subStatus === "QUOTATION_CORRECTION" ? (
                        <Button asChild size="sm">
                          <Link href={`/quotation-team/leads/${lead.id}`}>
                            Create Quotation
                          </Link>
                        </Button>
                      ) : (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/quotation-team/leads/${lead.id}`}>
                            Open Workspace
                          </Link>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === lead.id || !lead.canStart}
                        onClick={() => startQuotationWork(lead.id)}
                      >
                        Start Work
                      </Button>
                      <Button
                        size="sm"
                        disabled={busyId === lead.id || !lead.canSubmit}
                        onClick={() => openSubmitDialog(lead)}
                      >
                        Submit Work
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Lead Attachments
                    </p>
                    {canShowLeadAttachments(lead) ? (
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
                              <span className="max-w-[220px] truncate">{attachment.fileName}</span>
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
                      <div className="rounded-md border border-dashed border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                        Click Start Work to view and download lead attachments.
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mt-4 border-t border-border/40 pt-4">
                    {lead.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-4 w-4 shrink-0 text-primary/70" />
                        <span className="max-w-[200px] truncate" title={lead.location}>{lead.location}</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50/80 px-2.5 py-1 text-xs font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                      <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      Short SQFT: <strong>{lead.avgShortSqft ? lead.avgShortSqft.toLocaleString() : 0}</strong>
                      <span className="opacity-40">|</span>
                      Detail SQFT: <strong>{lead.avgDetailSqft ? lead.avgDetailSqft.toLocaleString() : 0}</strong>
                    </span>
                    {lead.srCrmAssignee && (
                      <span className="inline-flex items-center gap-1">
                        <UserRound className="h-4 w-4 shrink-0 text-primary/70" />
                        <span className="max-w-[150px] truncate" title={`SR CRM: ${lead.srCrmAssignee.fullName}`}>SR CRM: {lead.srCrmAssignee.fullName}</span>
                      </span>
                    )}
                    {lead.jrArchitectAssignee && (
                      <span className="inline-flex items-center gap-1">
                        <PenTool className="h-4 w-4 shrink-0 text-primary/70" />
                        <span className="max-w-[150px] truncate" title={`Jr Arch: ${lead.jrArchitectAssignee.fullName}`}>Jr Arch: {lead.jrArchitectAssignee.fullName}</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-4 w-4 shrink-0 text-primary/70" />
                      Visit Date:
                      <span className="font-medium text-foreground">
                        {lead.latestFirstMeeting?.startsAt
                          ? new Date(
                              lead.latestFirstMeeting.startsAt,
                            ).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' })
                          : "Not set"}
                      </span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          )}
        </>
        )}
      </main>

      <Dialog
        open={Boolean(submitLead)}
        onOpenChange={(open) => {
          if (busyId) return;
          if (!open) {
            setSubmitLead(null);
            setSubmitNote("");
          }
        }}
      >
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Submit Quotation Work</DialogTitle>
            <DialogDescription>
              Send the completed quotation details to the assigned Senior CRM Review Center.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Work details for {submitLead?.name} (optional)
              </p>
              <Textarea
                rows={5}
                value={submitNote}
                onChange={(event) => setSubmitNote(event.target.value)}
                placeholder="Add optional notes for Senior CRM review..."
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Quotation files</p>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Choose Short or Detail for each PDF. Short quotations also need a package type.</p>
                {submitAttachments.map((attachment, index) => (
                  <div key={attachment.id} className="space-y-2 rounded-md border p-3">
                    <p className="text-xs font-medium text-muted-foreground">Attachment {index + 1}</p>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={attachment.documentType}
                      onChange={(event) => setSubmitAttachments((prev) => prev.map((item) => item.id === attachment.id ? { ...item, documentType: event.target.value as AttachmentDocumentType } : item))}
                    >
                      <option value="SHORT">Short</option>
                      <option value="DETAIL">Detail</option>
                    </select>
                    {attachment.documentType === "SHORT" ? (
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={attachment.packageType}
                        onChange={(event) => setSubmitAttachments((prev) => prev.map((item) => item.id === attachment.id ? { ...item, packageType: event.target.value as QuotationPackageType } : item))}
                      >
                        <option value="PREMIUM">Premium</option>
                        <option value="STANDARD">Standard</option>
                        <option value="BASIC">Basic</option>
                        <option value="MIXED">Mix</option>
                      </select>
                    ) : null}
                    <Input type="file" accept="application/pdf,.pdf" onChange={(event) => setSubmitAttachments((prev) => prev.map((item) => item.id === attachment.id ? { ...item, file: event.target.files?.[0] ?? null } : item))} />
                    {submitAttachments.length > 1 ? <Button type="button" variant="outline" size="sm" onClick={() => setSubmitAttachments((prev) => prev.filter((item) => item.id !== attachment.id))}>Remove</Button> : null}
                  </div>
                ))}
                <Button type="button" variant="secondary" onClick={() => setSubmitAttachments((prev) => [...prev, { id: crypto.randomUUID(), file: null, documentType: "SHORT", packageType: "PREMIUM" }])}>Add Attachment</Button>
              </div>
              <p className="text-xs text-muted-foreground"><span className="font-bold">PDF files only</span></p>
              {submitAttachments.some((item) => item.file) ? (
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {submitAttachments.filter((item) => item.file).map((item) => (
                    <li key={item.id}>{item.file?.name} <span className="font-medium">({item.documentType}{item.documentType === "SHORT" ? ` / ${item.packageType}` : ""})</span></li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={Boolean(busyId)}
              onClick={() => {
                setSubmitLead(null);
                setSubmitNote("");
                setSubmitAttachments([{ id: crypto.randomUUID(), file: null, documentType: "SHORT", packageType: "PREMIUM" }]);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={Boolean(busyId)}
              onClick={() => void submitQuotationWork()}
            >
              {uploadingFiles ? "Uploading files..." : busyId ? "Submitting..." : "Submit to Review Center"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
