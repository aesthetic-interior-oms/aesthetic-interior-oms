"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, FileText, Loader2, MapPin, UserRound, Sparkles, ClipboardList, PenTool, CheckCircle, RotateCcw, CalendarClock, UserCheck } from "lucide-react";
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
  quotationAssignee: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  projectSqft: number | null;
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

export default function SrCrmQuotationPage() {
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
      const response = await fetch("/api/sr/quotation-tasks", {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success || !Array.isArray(payload.data)) {
        throw new Error(payload?.error ?? "Failed to load quotation queue");
      }
      setLeads(payload.data as TaskLead[]);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load quotation queue",
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
      assigned: leads.filter((l) => l.subStatus === "QUOTATION_ASSIGNED").length,
      working: leads.filter((l) => l.subStatus === "QUOTATION_WORKING").length,
      completed: leads.filter(
        (l) =>
          l.subStatus === "QUOTATION_COMPLETED" ||
          l.subStatus === "QUOTATION_APPROVED",
      ).length,
    }),
    [leads],
  );

  const handleStartWork = async (leadId: string) => {
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
        error instanceof Error ? error.message : "Failed to start work",
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleSelfAssignQuotationMaker = async (leadId: string) => {
    setBusyId(leadId);
    try {
      // Fetch current logged in user ID via /api/me (returns user at root level)
      const userRes = await fetch('/api/me', { cache: 'no-store' });
      const userPayload = await userRes.json();
      const meId = userPayload?.id;
      if (!meId) throw new Error('User info unavailable – please refresh and try again');

      const response = await fetch(`/api/lead/${leadId}/assignments/QUOTATION`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: meId }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Failed to assign quotation maker');
      }
      toast.success('Assigned as quotation maker');
      await loadTasks();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to self-assign quotation');
    } finally {
      setBusyId(null);
    }
  };

  const handleUploadFile = async (
    index: number,
    file: File | null,
  ) => {
    if (!file) return;
    setSubmitAttachments((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], file };
      }
      return copy;
    });
  };

  const handleAddAttachmentRow = () => {
    setSubmitAttachments((prev) => [...prev, createEmptyAttachment()]);
  };

  const handleRemoveAttachmentRow = (id: string) => {
    setSubmitAttachments((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((item) => item.id !== id);
    });
  };

  const handleOpenSubmitModal = (lead: TaskLead) => {
    setSubmitLead(lead);
    setSubmitNote("");
    setSubmitAttachments([createEmptyAttachment()]);
  };

  const handleSubmitWork = async () => {
    if (!submitLead) return;
    setUploadingFiles(true);
    try {
      const validAttachments = submitAttachments.filter(
        (att) => att.file !== null,
      );

      const uploadedFiles: Array<{
        url: string;
        fileName: string;
        fileType: string;
        sizeBytes: number;
        documentType: AttachmentDocumentType;
        packageType: QuotationPackageType;
      }> = [];

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
          url: uploaded.url,
          fileName:
            attachment.documentType === "SHORT"
              ? `[Short - ${attachment.packageType}] ${uploaded.fileName}`
              : `[Detail] ${uploaded.fileName}`,
          fileType: uploaded.fileType,
          sizeBytes: uploaded.sizeBytes,
          documentType: attachment.documentType,
          packageType: attachment.packageType,
        });
      }

      const response = await fetch(
        `/api/lead/${submitLead.id}/quotation-work/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            note: submitNote.trim() || undefined,
            files: uploadedFiles,
          }),
        },
      );

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? "Failed to submit quotation work");
      }

      toast.success("Quotation submitted successfully for review");
      setSubmitLead(null);
      await loadTasks();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit quotation",
      );
    } finally {
      setUploadingFiles(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <CrmPageHeader
        title="Senior CRM Quotation Queue"
        subtitle="Manage and create quotations directly for your assigned leads."
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {/* KPI Overview Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border border-border/60 bg-gradient-to-br from-background via-muted/10 to-muted/30 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Total Assigned Leads
                </span>
                <span className="rounded-md bg-blue-500/10 p-1.5 text-blue-600 dark:text-blue-400">
                  <ClipboardList className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {summary.total}
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border/60 bg-gradient-to-br from-background via-amber-500/5 to-amber-500/10 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase">
                  Pending Start
                </span>
                <span className="rounded-md bg-amber-500/10 p-1.5 text-amber-600 dark:text-amber-400">
                  <RotateCcw className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-amber-950 dark:text-amber-100">
                {summary.assigned}
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border/60 bg-gradient-to-br from-background via-purple-500/5 to-purple-500/10 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase">
                  In Progress
                </span>
                <span className="rounded-md bg-purple-500/10 p-1.5 text-purple-600 dark:text-purple-400">
                  <PenTool className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-purple-950 dark:text-purple-100">
                {summary.working}
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border/60 bg-gradient-to-br from-background via-emerald-500/5 to-emerald-500/10 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase">
                  Completed / Approved
                </span>
                <span className="rounded-md bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-emerald-950 dark:text-emerald-100">
                {summary.completed}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* View Switcher & Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">
              Lead Quotation Workspace
            </h2>
            <Badge variant="secondary">{leads.length} Leads</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "card" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("card")}
            >
              Card View
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("table")}
            >
              Table View
            </Button>
            <Button variant="outline" size="sm" onClick={() => void loadTasks()}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-3 py-16 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Loading quotation queue...</p>
          </div>
        ) : leads.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-base font-semibold">No Quotation Tasks</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                You have no assigned leads in the quotation phase.
              </p>
            </CardContent>
          </Card>
        ) : viewMode === "card" ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {leads.map((lead) => {
              const isBudgetPhase = lead.stage === "BUDGET_PHASE";
              const isWorking = lead.subStatus === "QUOTATION_WORKING";
              const isAssigned = lead.subStatus === "QUOTATION_ASSIGNED";
              const isCompleted =
                lead.subStatus === "QUOTATION_COMPLETED" ||
                lead.subStatus === "QUOTATION_APPROVED";

              return (
                <Card
                  key={lead.id}
                  className="flex flex-col justify-between overflow-hidden border border-border/70 shadow-xs transition-shadow hover:shadow-md"
                >
                  <div className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/quotation-team/leads/${lead.id}`}
                          className="font-bold text-foreground hover:underline"
                        >
                          {lead.name}
                        </Link>
                        {lead.location ? (
                          <p className="mt-1 flex items-center text-xs text-muted-foreground">
                            <MapPin className="mr-1 h-3 w-3 shrink-0" />
                            {lead.location}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {isBudgetPhase && (
                          <Badge variant="outline" className="text-xs border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-950/30 dark:text-orange-300">
                            Budget Phase
                          </Badge>
                        )}
                        <Badge
                          variant={
                            isCompleted
                              ? "default"
                              : isWorking
                              ? "secondary"
                              : "outline"
                          }
                          className="text-xs"
                        >
                          {formatLabel(lead.subStatus ?? lead.stage)}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2 rounded-lg bg-muted/40 p-3 text-xs">
                      {lead.projectSqft ? (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Project Sqft:</span>
                          <span className="font-semibold">{lead.projectSqft} SQFT</span>
                        </div>
                      ) : null}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Quotation Maker:</span>
                        <span className="font-medium text-foreground">
                          {lead.quotationAssignee?.fullName ?? "Unassigned"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t bg-muted/20 px-5 py-3">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/quotation-team/leads/${lead.id}`}>
                        <PenTool className="mr-1.5 h-3.5 w-3.5" />
                        Open Quotation Maker
                      </Link>
                    </Button>
                    {!isBudgetPhase && !lead.quotationAssignee ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busyId === lead.id}
                        onClick={() => void handleSelfAssignQuotationMaker(lead.id)}
                      >
                        <UserCheck className="mr-1 h-3.5 w-3.5" />
                        {busyId === lead.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Self-Assign"}
                      </Button>
                    ) : !isBudgetPhase && isAssigned ? (
                      <Button
                        size="sm"
                        disabled={busyId === lead.id}
                        onClick={() => void handleStartWork(lead.id)}
                      >
                        {busyId === lead.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Start Work"
                        )}
                      </Button>
                    ) : !isBudgetPhase && isWorking ? (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleOpenSubmitModal(lead)}
                      >
                        Submit
                      </Button>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs font-semibold uppercase text-muted-foreground">
                    <tr>
                      <th className="p-4">Lead Name</th>
                      <th className="p-4">Location</th>
                      <th className="p-4">Stage</th>
                      <th className="p-4">Quotation Maker</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Project Sqft</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {leads.map((lead) => {
                      const isBudgetPhase = lead.stage === "BUDGET_PHASE";
                      return (
                        <tr key={lead.id} className="hover:bg-muted/30">
                          <td className="p-4 font-semibold text-foreground">
                            <Link
                              href={`/quotation-team/leads/${lead.id}`}
                              className="hover:underline"
                            >
                              {lead.name}
                            </Link>
                          </td>
                          <td className="p-4 text-muted-foreground">{lead.location ?? "N/A"}</td>
                          <td className="p-4">
                            {isBudgetPhase ? (
                              <Badge variant="outline" className="text-xs border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-950/30 dark:text-orange-300">
                                Budget Phase
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                Quotation Phase
                              </Badge>
                            )}
                          </td>
                          <td className="p-4 font-medium text-foreground">
                            {lead.quotationAssignee?.fullName ?? "Unassigned"}
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className="text-xs">
                              {formatLabel(lead.subStatus ?? lead.stage)}
                            </Badge>
                          </td>
                          <td className="p-4 text-right font-medium">
                            {lead.projectSqft ? `${lead.projectSqft} SQFT` : "N/A"}
                          </td>
                          <td className="p-4 text-right">
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/quotation-team/leads/${lead.id}`}>
                                Open Quotation Maker
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Submission Modal */}
      <Dialog
        open={Boolean(submitLead)}
        onOpenChange={(open) => {
          if (!open && !uploadingFiles) setSubmitLead(null);
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Submit Quotation Work</DialogTitle>
            <DialogDescription>
              Upload exported quotation PDFs and submit for Senior CRM / Admin review.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-foreground">Note / Comments</label>
              <Textarea
                placeholder="Add any specific details or pricing notes..."
                value={submitNote}
                onChange={(e) => setSubmitNote(e.target.value)}
                className="mt-1 text-sm"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">Attachments</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddAttachmentRow}
                >
                  + Add File
                </Button>
              </div>

              {submitAttachments.map((att, idx) => (
                <div key={att.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => void handleUploadFile(idx, e.target.files?.[0] ?? null)}
                    className="h-8 max-w-xs text-xs"
                  />
                  {submitAttachments.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAttachmentRow(att.id)}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSubmitLead(null)}
              disabled={uploadingFiles}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleSubmitWork()} disabled={uploadingFiles}>
              {uploadingFiles ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Uploading & Submitting...
                </>
              ) : (
                "Submit Quotation"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
