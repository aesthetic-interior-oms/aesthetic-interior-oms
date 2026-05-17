"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, FileText, Loader2, MapPin, Phone, UserRound } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [leads, setLeads] = useState<TaskLead[]>([]);
  const [submitLead, setSubmitLead] = useState<TaskLead | null>(null);
  const [submitNote, setSubmitNote] = useState("");
  const [submitFiles, setSubmitFiles] = useState<File[]>([]);
  const [submitQuotationFileType, setSubmitQuotationFileType] = useState<"PREMIUM" | "STANDARD" | "BASIC">("PREMIUM");
  const [submitBudget, setSubmitBudget] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState(false);

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
      assigned: leads.filter((lead) => lead.subStatus === "QUOTATION_ASSIGNED")
        .length,
      working: leads.filter((lead) => lead.subStatus === "QUOTATION_WORKING")
        .length,
      completed: leads.filter(
        (lead) => lead.subStatus === "QUOTATION_COMPLETED",
      ).length,
      corrections: leads.filter(
        (lead) => lead.subStatus === "QUOTATION_CORRECTION",
      ).length,
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
    setSubmitFiles([]);
    setSubmitQuotationFileType("PREMIUM");
    setSubmitBudget("");
  };

  const submitQuotationWork = async () => {
    if (!submitLead) return;
    const budgetValue = Number(submitBudget.trim().replace(/,/g, ""));
    if (!Number.isFinite(budgetValue) || budgetValue <= 0) {
      toast.error("Please enter a valid budget amount");
      return;
    }
    if (submitFiles.length === 0) {
      toast.error("Please attach at least one quotation file");
      return;
    }
    setBusyId(submitLead.id);
    try {
      setUploadingFiles(true);
      const uploadedFiles: UploadedBlobFileMeta[] = [];
      for (const file of submitFiles) {
        const uploaded = await uploadDirectBlobFile({
          file,
          context: "quotation-work",
          ownerId: submitLead.id,
          quotationFileType: submitQuotationFileType,
        });
        uploadedFiles.push(uploaded);
      }
      setUploadingFiles(false);
      const response = await fetch(
        `/api/lead/${submitLead.id}/quotation-work/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            note: submitNote.trim() || undefined,
            budget: budgetValue,
            quotationType: submitQuotationFileType,
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
      setSubmitFiles([]);
      setSubmitQuotationFileType("PREMIUM");
      setSubmitBudget("");
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
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Total: {summary.total}</Badge>
          <Badge variant="secondary">Assigned: {summary.assigned}</Badge>
          <Badge variant="secondary">Working: {summary.working}</Badge>
          <Badge variant="secondary">Completed: {summary.completed}</Badge>
          <Badge variant="secondary">Corrections: {summary.corrections}</Badge>
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
                      lead.subStatus === "QUOTATION_COMPLETED" ? (
                        <Button asChild size="sm">
                          <Link href={`/quotation-team/leads/${lead.id}`}>
                            Workspace
                          </Link>
                        </Button>
                      ) : (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/quotation-team/leads/${lead.id}`}>
                            Open Lead
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

                  <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                    <p className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {lead.phone || "No phone"}
                    </p>
                    <p className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {lead.location || "No location"}
                    </p>
                    <p className="inline-flex items-center gap-1 md:col-span-2">
                      <UserRound className="h-3.5 w-3.5" />
                      First Meeting:
                      <span className="font-medium text-foreground">
                        {lead.latestFirstMeeting?.startsAt
                          ? new Date(
                              lead.latestFirstMeeting.startsAt,
                            ).toLocaleString()
                          : "Not set"}
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Quotation Work</DialogTitle>
            <DialogDescription>
              Send the completed quotation details to the assigned Senior CRM
              Review Center. The lead will move to Quotation Completed and leave
              the Budget Queue until approval.
            </DialogDescription>
          </DialogHeader>
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
            <p className="text-sm font-medium">Attachments (optional)</p>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Choose quotation file type first</p>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={submitQuotationFileType}
                onChange={(event) => setSubmitQuotationFileType(event.target.value as "PREMIUM" | "STANDARD" | "BASIC")}
              >
                <option value="PREMIUM">Premium</option>
                <option value="STANDARD">Standard</option>
                <option value="BASIC">Basic</option>
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Budget amount</p>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="e.g. 300000"
                value={submitBudget}
                onChange={(event) => setSubmitBudget(event.target.value)}
              />
            </div>
            <Input
              type="file"
              multiple
              onChange={(event) => setSubmitFiles(Array.from(event.target.files ?? []))}
            />
            <p className="text-xs text-muted-foreground">
              Supported for quotation submit: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, TXT, CSV, and CAD files when needed.
            </p>
            {submitFiles.length > 0 ? (
              <ul className="space-y-1 text-xs text-muted-foreground">
                {submitFiles.map((file) => (
                  <li key={`${file.name}-${file.size}`}>{file.name} <span className="font-medium">({submitQuotationFileType})</span></li>
                ))}
              </ul>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={Boolean(busyId)}
              onClick={() => {
                setSubmitLead(null);
                setSubmitNote("");
                setSubmitFiles([]);
                setSubmitQuotationFileType("PREMIUM");
                setSubmitBudget("");
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
