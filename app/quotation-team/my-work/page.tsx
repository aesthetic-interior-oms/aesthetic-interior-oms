"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUp,
  Building2,
  Calendar,
  CalendarClock,
  ChevronRight,
  Clock,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  HardDrive,
  LayoutGrid,
  List,
  Loader2,
  MapPin,
  Monitor,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { CrmPageHeader } from "@/components/crm/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { uploadDirectGCSFile } from "@/lib/client-gcs-upload";
import { DailyWorkReportModal } from "@/components/crm/quotation/daily-work-report-modal";

type TaskLead = {
  id: string;
  name: string;
  phone: string | null;
  location: string | null;
  stage: string;
  subStatus: string | null;
  updatedAt: string;
  assignedAt?: string | null;
  assignedDate?: string | null;
  assignedMonthKey?: string | null;
  assignedYear?: number | null;
  assignedMonth?: number | null;
  visitDate: string | null;
  visitMonthKey: string | null;
  budget?: number | null;
  projectSqft?: number | null;
  avgDetailSqft?: number;
  avgShortSqft?: number;
  detailVersionsCount?: number;
  shortPackagesCount?: number;
  latestFirstMeeting: {
    id: string;
    title: string;
    notes: string | null;
    startsAt: string;
  } | null;
  srCrmAssignee?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  canStart: boolean;
  canSubmit: boolean;
};

const MONTH_NAMES = [
  { num: 1, name: "January", short: "Jan" },
  { num: 2, name: "February", short: "Feb" },
  { num: 3, name: "March", short: "Mar" },
  { num: 4, name: "April", short: "Apr" },
  { num: 5, name: "May", short: "May" },
  { num: 6, name: "June", short: "Jun" },
  { num: 7, name: "July", short: "Jul" },
  { num: 8, name: "August", short: "Aug" },
  { num: 9, name: "September", short: "Sep" },
  { num: 10, name: "October", short: "Oct" },
  { num: 11, name: "November", short: "Nov" },
  { num: 12, name: "December", short: "Dec" },
];

function formatLabel(value: string | null | undefined) {
  if (!value) return "N/A";
  if (value === "DISCOVERY") return "Consulting Phase";
  if (value === "PROPOSAL_SENT") return "Quotation Sent";
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function QuotationTeamMyWorkPage() {
  type QuotationFileType = "PREMIUM" | "STANDARD" | "BASIC" | "MIXED" | "PLATINUM" | "LUXURY";
  type AttachmentInput = { id: string; file: File | null; quotationType: QuotationFileType; budget: string };

  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [leads, setLeads] = useState<TaskLead[]>([]);
  const [submitLead, setSubmitLead] = useState<TaskLead | null>(null);
  const [submitNote, setSubmitNote] = useState("");
  const [submitAttachments, setSubmitAttachments] = useState<AttachmentInput[]>([
    { id: crypto.randomUUID(), file: null, quotationType: "PREMIUM", budget: "" },
  ]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [dailyReportModalOpen, setDailyReportModalOpen] = useState(false);

  // File explorer navigation state
  // Levels: 'ROOT' (Years) -> 'YEAR' (Months) -> 'MONTH' (Projects)
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [currentMonth, setCurrentMonth] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/quotation/assigned-tasks?includeHistory=1", {
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

  // Derive unique years from leads (plus current year)
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(new Date().getFullYear());
    for (const lead of leads) {
      if (lead.assignedYear) {
        yearsSet.add(lead.assignedYear);
      } else if (lead.assignedAt) {
        yearsSet.add(new Date(lead.assignedAt).getFullYear());
      }
    }
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [leads]);

  // Auto-select current year on initial load once data is ready
  useEffect(() => {
    if (currentYear === null && availableYears.length > 0) {
      setCurrentYear(availableYears[0]);
    }
  }, [availableYears, currentYear]);

  // Overall summary metrics
  const summary = useMemo(
    () => ({
      total: leads.length,
      assigned: leads.filter((lead) => lead.subStatus === "QUOTATION_ASSIGNED").length,
      working: leads.filter((lead) => lead.subStatus === "QUOTATION_WORKING").length,
      completed: leads.filter((lead) => lead.subStatus === "QUOTATION_COMPLETED").length,
      corrections: leads.filter((lead) => lead.subStatus === "QUOTATION_CORRECTION").length,
    }),
    [leads],
  );

  // Group leads by year and month
  // Structure: Map<year, Map<monthNum, TaskLead[]>>
  const leadsByYearMonth = useMemo(() => {
    const map = new Map<number, Map<number, TaskLead[]>>();

    for (const lead of leads) {
      let y = lead.assignedYear;
      let m = lead.assignedMonth;

      if (!y || !m) {
        const d = lead.assignedAt ? new Date(lead.assignedAt) : new Date(lead.updatedAt);
        y = d.getFullYear();
        m = d.getMonth() + 1;
      }

      if (!map.has(y)) map.set(y, new Map<number, TaskLead[]>());
      const yearMap = map.get(y)!;
      if (!yearMap.has(m)) yearMap.set(m, []);
      yearMap.get(m)!.push(lead);
    }

    return map;
  }, [leads]);

  // Leads in the currently selected month
  const currentMonthLeads = useMemo(() => {
    if (currentYear === null || currentMonth === null) return [];
    const yearMap = leadsByYearMonth.get(currentYear);
    if (!yearMap) return [];
    const monthLeads = yearMap.get(currentMonth) || [];

    return monthLeads.filter((lead) => {
      if (statusFilter !== "ALL") {
        if (statusFilter === "WORKING" && lead.subStatus !== "QUOTATION_WORKING") return false;
        if (statusFilter === "ASSIGNED" && lead.subStatus !== "QUOTATION_ASSIGNED") return false;
        if (statusFilter === "COMPLETED" && lead.subStatus !== "QUOTATION_COMPLETED") return false;
        if (statusFilter === "CORRECTION" && lead.subStatus !== "QUOTATION_CORRECTION") return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = lead.name.toLowerCase().includes(q);
        const matchesPhone = lead.phone?.toLowerCase().includes(q);
        const matchesLocation = lead.location?.toLowerCase().includes(q);
        return matchesName || matchesPhone || matchesLocation;
      }
      return true;
    });
  }, [currentYear, currentMonth, leadsByYearMonth, statusFilter, searchQuery]);

  // Global search leads (if user types in search bar while at root or year level)
  const searchMatchedLeads = useMemo(() => {
    if (!searchQuery.trim() || currentMonth !== null) return [];
    const q = searchQuery.toLowerCase();
    return leads.filter((lead) => {
      const matchesName = lead.name.toLowerCase().includes(q);
      const matchesPhone = lead.phone?.toLowerCase().includes(q);
      const matchesLocation = lead.location?.toLowerCase().includes(q);
      return matchesName || matchesPhone || matchesLocation;
    });
  }, [searchQuery, currentMonth, leads]);

  // Navigation handlers
  const handleGoToRoot = () => {
    setCurrentYear(null);
    setCurrentMonth(null);
  };

  const handleGoToYear = (year: number) => {
    setCurrentYear(year);
    setCurrentMonth(null);
  };

  const handleGoToMonth = (monthNum: number) => {
    setCurrentMonth(monthNum);
  };

  const handleGoUp = () => {
    if (currentMonth !== null) {
      setCurrentMonth(null);
    } else if (currentYear !== null) {
      setCurrentYear(null);
    }
  };

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
    setSubmitAttachments([{ id: crypto.randomUUID(), file: null, quotationType: "PREMIUM", budget: "" }]);
  };

  const submitQuotationWork = async () => {
    if (!submitLead) return;
    const validAttachments = submitAttachments.filter((item) => item.file);
    const parsedBudgets = validAttachments.map((item) => Number(item.budget.trim().replace(/,/g, "")));
    if (parsedBudgets.some((budget) => Number.isNaN(budget) || budget <= 0)) {
      toast.error("Please enter a valid positive budget for each attached file");
      return;
    }

    setBusyId(submitLead.id);
    try {
      setUploadingFiles(true);
      const uploadedFiles: Array<{ url: string; fileName: string; fileType: string; sizeBytes: number }> = [];

      for (const attachment of validAttachments) {
        if (!attachment.file) continue;
        const uploadResult = await uploadDirectGCSFile({
          file: attachment.file,
          context: "quotation-work",
          ownerId: submitLead.id,
        });
        uploadedFiles.push({
          url: uploadResult.url,
          fileName: uploadResult.fileName,
          fileType: uploadResult.fileType,
          sizeBytes: uploadResult.sizeBytes,
        });
      }

      setUploadingFiles(false);

      const response = await fetch(
        `/api/lead/${submitLead.id}/quotation-work/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            note: submitNote.trim() ? submitNote.trim() : null,
            budget: parsedBudgets[0] ?? null,
            quotationType: validAttachments[0]?.quotationType ?? null,
            files: uploadedFiles,
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
      setSubmitAttachments([{ id: crypto.randomUUID(), file: null, quotationType: "PREMIUM", budget: "" }]);
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

  // Current folder name for breadcrumb
  const currentMonthMeta = currentMonth
    ? MONTH_NAMES.find((m) => m.num === currentMonth)
    : null;

  return (
    <div className="min-h-screen bg-background">
      <CrmPageHeader
        title="Quotation File Explorer"
        subtitle="Browse and manage all assigned projects organized as a local PC file directory by Year and Month."
      />

      <main className="mx-auto max-w-[1440px] px-6 py-6 space-y-4">
        {/* Top Summary & Daily Work Action */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Total: {summary.total}</Badge>
            <Badge variant="secondary">Assigned: {summary.assigned}</Badge>
            <Badge variant="secondary">Working: {summary.working}</Badge>
            <Badge variant="secondary">Completed: {summary.completed}</Badge>
            <Badge variant="secondary">Corrections: {summary.corrections}</Badge>
          </div>
          <Button
            size="sm"
            onClick={() => setDailyReportModalOpen(true)}
            className="h-8 gap-1.5 font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
          >
            <Calendar className="h-3.5 w-3.5" />
            Today&apos;s Work Report
          </Button>
        </div>

        {/* --- LOCAL PC FILE EXPLORER WINDOW --- */}
        <div className="rounded-xl border border-border/80 bg-card shadow-sm overflow-hidden flex flex-col">
          {/* File Explorer Titlebar */}
          <div className="bg-muted/40 border-b border-border/60 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Monitor className="h-4 w-4 text-primary" />
              <span>Quotation PC Explorer</span>
              <span className="text-muted-foreground">• Local Storage Hierarchy</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/80 inline-block" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80 inline-block" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80 inline-block" />
            </div>
          </div>

          {/* Explorer Toolbar / Address Bar */}
          <div className="p-3 border-b border-border/60 bg-card flex flex-wrap items-center justify-between gap-3">
            {/* Navigation buttons (Back, Up, Refresh) */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={currentYear === null && currentMonth === null}
                onClick={handleGoUp}
                title="Go up one folder"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => void loadTasks()}
                disabled={loading}
                title="Refresh folder contents"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {/* Clickable Breadcrumb Address Bar */}
            <div className="flex-1 min-w-[240px] flex items-center gap-1 rounded-lg border border-border/70 bg-background px-3 py-1 text-xs">
              <HardDrive className="h-3.5 w-3.5 text-primary shrink-0 mr-1" />
              <button
                type="button"
                onClick={handleGoToRoot}
                className="font-medium hover:text-primary transition-colors truncate"
              >
                This PC
              </button>

              {currentYear !== null && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <button
                    type="button"
                    onClick={() => handleGoToYear(currentYear)}
                    className={`font-medium transition-colors ${
                      currentMonth === null ? "text-primary font-bold" : "hover:text-primary text-foreground"
                    }`}
                  >
                    📁 {currentYear}
                  </button>
                </>
              )}

              {currentMonthMeta && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-primary font-bold truncate">
                    📁 {currentMonthMeta.name}
                  </span>
                </>
              )}
            </div>

            {/* Right Controls: Search & View Toggle */}
            <div className="flex items-center gap-2">
              <div className="relative w-48 sm:w-60">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-background"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>

              {currentMonth !== null && (
                <div className="flex items-center border rounded-md p-0.5 bg-muted/20">
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setViewMode("grid")}
                    title="Grid view"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setViewMode("list")}
                    title="List view"
                  >
                    <List className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Explorer Main Content Area */}
          <div className="p-5 min-h-[460px] bg-muted/5">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Loading file system...</p>
              </div>
            ) : searchQuery.trim() && currentMonth === null ? (
              /* Global Search Results View */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Search className="h-4 w-4 text-primary" />
                    Search Results for &quot;{searchQuery}&quot; ({searchMatchedLeads.length})
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")} className="text-xs h-7">
                    Clear Search
                  </Button>
                </div>

                {searchMatchedLeads.length === 0 ? (
                  <div className="text-center py-16 text-sm text-muted-foreground">
                    No quotation files match &quot;{searchQuery}&quot;
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {searchMatchedLeads.map((lead) => (
                      <ProjectFileCard
                        key={lead.id}
                        lead={lead}
                        busyId={busyId}
                        onStartWork={startQuotationWork}
                        onSubmitWork={openSubmitDialog}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : currentYear === null ? (
              /* --- LEVEL 1: ROOT DIRECTORY (YEARS) --- */
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Folders (Years)
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {availableYears.length} {availableYears.length === 1 ? "Year" : "Years"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {availableYears.map((year) => {
                    const yearMap = leadsByYearMonth.get(year);
                    let yearProjectCount = 0;
                    if (yearMap) {
                      for (const monthList of yearMap.values()) {
                        yearProjectCount += monthList.length;
                      }
                    }

                    return (
                      <button
                        key={year}
                        type="button"
                        onClick={() => handleGoToYear(year)}
                        className="group flex flex-col items-center justify-center p-4 rounded-xl border border-border/70 bg-card hover:bg-primary/5 hover:border-primary/50 transition-all text-center shadow-xs cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                      >
                        <div className="relative mb-2">
                          <Folder className="h-14 w-14 text-amber-500 fill-amber-500/20 group-hover:scale-105 transition-transform" />
                          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                            {yearProjectCount}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                          {year}
                        </span>
                        <span className="text-[11px] text-muted-foreground mt-0.5">
                          {yearProjectCount} {yearProjectCount === 1 ? "Project" : "Projects"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : currentMonth === null ? (
              /* --- LEVEL 2: YEAR DIRECTORY (12 MONTHS) --- */
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={handleGoToRoot} className="h-7 text-xs px-2">
                      <ArrowLeft className="h-3 w-3 mr-1" /> All Years
                    </Button>
                    <span className="text-sm font-bold text-foreground">
                      Year: {currentYear}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">12 Months</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {MONTH_NAMES.map((m) => {
                    const yearMap = leadsByYearMonth.get(currentYear);
                    const monthLeads = yearMap?.get(m.num) || [];
                    const count = monthLeads.length;
                    const hasItems = count > 0;

                    return (
                      <button
                        key={m.num}
                        type="button"
                        onClick={() => handleGoToMonth(m.num)}
                        className={`group flex flex-col items-center justify-center p-4 rounded-xl border transition-all text-center cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-primary/40 ${
                          hasItems
                            ? "bg-card border-border/80 hover:border-primary/50 hover:bg-primary/5 shadow-xs"
                            : "bg-muted/10 border-dashed border-border/50 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <div className="relative mb-2">
                          <Folder
                            className={`h-14 w-14 transition-transform group-hover:scale-105 ${
                              hasItems
                                ? "text-amber-500 fill-amber-500/20"
                                : "text-muted-foreground/40 fill-muted/10"
                            }`}
                          />
                          {hasItems && (
                            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                              {count}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                          {String(m.num).padStart(2, "0")} - {m.name}
                        </span>
                        <span
                          className={`text-[10px] mt-0.5 font-medium ${
                            hasItems ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-muted-foreground"
                          }`}
                        >
                          {count} {count === 1 ? "Project" : "Projects"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* --- LEVEL 3: MONTH DIRECTORY (PROJECTS / QUOTATION FILES) --- */
              <div className="space-y-4">
                {/* Folder Header & Sub-filters */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(null)} className="h-7 text-xs px-2">
                      <ArrowLeft className="h-3 w-3 mr-1" /> Months
                    </Button>
                    <FolderOpen className="h-5 w-5 text-amber-500" />
                    <h2 className="text-base font-bold text-foreground">
                      {currentMonthMeta?.name} {currentYear}
                    </h2>
                    <Badge variant="secondary" className="text-xs">
                      {currentMonthLeads.length} {currentMonthLeads.length === 1 ? "Project" : "Projects"}
                    </Badge>
                  </div>

                  {/* Status Pills */}
                  <div className="flex flex-wrap gap-1">
                    {["ALL", "ASSIGNED", "WORKING", "COMPLETED", "CORRECTION"].map((st) => (
                      <Button
                        key={st}
                        variant={statusFilter === st ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-xs px-2.5"
                        onClick={() => setStatusFilter(st)}
                      >
                        {st === "ALL" ? "All Statuses" : st.toLowerCase()}
                      </Button>
                    ))}
                  </div>
                </div>

                {currentMonthLeads.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-14 text-center space-y-2 bg-card/40">
                    <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
                    <p className="text-sm font-semibold text-foreground">
                      This folder is empty
                    </p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      No quotation projects were first assigned in {currentMonthMeta?.name} {currentYear}.
                    </p>
                  </div>
                ) : viewMode === "grid" ? (
                  /* Grid View of Project Files */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {currentMonthLeads.map((lead) => (
                      <ProjectFileCard
                        key={lead.id}
                        lead={lead}
                        busyId={busyId}
                        onStartWork={startQuotationWork}
                        onSubmitWork={openSubmitDialog}
                      />
                    ))}
                  </div>
                ) : (
                  /* Table / Details List View */
                  <div className="rounded-xl border bg-card overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 border-b text-muted-foreground uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Quotation Project</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">First Assigned Date</th>
                          <th className="py-2.5 px-3">Location &amp; Sqft</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {currentMonthLeads.map((lead) => (
                          <tr key={lead.id} className="hover:bg-muted/30">
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" />
                                <div>
                                  <Link
                                    href={`/quotation-team/leads/${lead.id}`}
                                    className="font-semibold text-foreground hover:text-primary hover:underline"
                                  >
                                    {lead.name}
                                  </Link>
                                  {lead.phone && (
                                    <p className="text-[10px] text-muted-foreground">{lead.phone}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <Badge
                                variant={
                                  lead.subStatus === "QUOTATION_COMPLETED"
                                    ? "default"
                                    : lead.subStatus === "QUOTATION_WORKING"
                                    ? "secondary"
                                    : "outline"
                                }
                                className="text-[10px]"
                              >
                                {formatLabel(lead.subStatus)}
                              </Badge>
                            </td>
                            <td className="py-3 px-3 font-semibold text-foreground">
                              {lead.assignedAt
                                ? new Date(lead.assignedAt).toLocaleDateString("en-GB", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "Not set"}
                            </td>
                            <td className="py-3 px-3">
                              <p className="truncate max-w-[150px]">{lead.location || "—"}</p>
                              <p className="text-[10px] text-muted-foreground">
                                Short: {lead.avgShortSqft || 0} | Detail: {lead.avgDetailSqft || 0} sqft
                              </p>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                                  <Link href={`/quotation-team/leads/${lead.id}`}>
                                    Workspace
                                  </Link>
                                </Button>
                                {lead.canSubmit && (
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => openSubmitDialog(lead)}
                                  >
                                    Submit
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Explorer Bottom Statusbar */}
          <div className="bg-muted/40 border-t border-border/60 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-muted-foreground">
            <div>
              {currentMonth !== null ? (
                <span>
                  <strong>{currentMonthLeads.length}</strong> items in <strong>{currentMonthMeta?.name} {currentYear}</strong>
                </span>
              ) : currentYear !== null ? (
                <span>
                  Viewing year <strong>{currentYear}</strong> (12 month directories)
                </span>
              ) : (
                <span>
                  Root Directory (<strong>{availableYears.length}</strong> Years)
                </span>
              )}
            </div>
            <div>
              <span>Local Storage Mode • First Assigned Month Archive</span>
            </div>
          </div>
        </div>
      </main>

      {/* Submit Work Dialog */}
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
              <p className="text-xs text-muted-foreground">Choose quotation file type and budget for each attachment</p>
              {submitAttachments.map((attachment, index) => (
                <div key={attachment.id} className="space-y-2 rounded-md border p-3">
                  <p className="text-xs font-medium text-muted-foreground">Attachment {index + 1}</p>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={attachment.quotationType}
                    onChange={(event) => setSubmitAttachments((prev) => prev.map((item) => item.id === attachment.id ? { ...item, quotationType: event.target.value as QuotationFileType } : item))}
                  >
                    <option value="MIXED">Mix</option>
                    <option value="PREMIUM">Premium</option>
                    <option value="PLATINUM">Platinum</option>
                    <option value="LUXURY">Luxury</option>
                  </select>
                  <Input type="text" inputMode="decimal" placeholder="e.g. 300000" value={attachment.budget} onChange={(event) => setSubmitAttachments((prev) => prev.map((item) => item.id === attachment.id ? { ...item, budget: event.target.value } : item))} />
                  <Input type="file" onChange={(event) => setSubmitAttachments((prev) => prev.map((item) => item.id === attachment.id ? { ...item, file: event.target.files?.[0] ?? null } : item))} />
                  <Button type="button" variant="outline" size="sm" onClick={() => setSubmitAttachments((prev) => prev.filter((item) => item.id !== attachment.id))}>Remove</Button>
                </div>
              ))}
              <Button type="button" variant="secondary" onClick={() => setSubmitAttachments((prev) => [...prev, { id: crypto.randomUUID(), file: null, quotationType: "PREMIUM", budget: "" }])}>Add Attachment</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Supported for quotation submit: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, TXT, CSV, and CAD files when needed.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={Boolean(busyId)}
              onClick={() => {
                setSubmitLead(null);
                setSubmitNote("");
                setSubmitAttachments([{ id: crypto.randomUUID(), file: null, quotationType: "PREMIUM", budget: "" }]);
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

      <DailyWorkReportModal
        open={dailyReportModalOpen}
        onOpenChange={setDailyReportModalOpen}
        onSaved={() => {
          void loadTasks();
        }}
      />
    </div>
  );
}

// Subcomponent: Project File Card inside the Month Directory
function ProjectFileCard({
  lead,
  busyId,
  onStartWork,
  onSubmitWork,
}: {
  lead: TaskLead;
  busyId: string | null;
  onStartWork: (id: string) => Promise<void>;
  onSubmitWork: (lead: TaskLead) => void;
}) {
  const isWorking = lead.subStatus === "QUOTATION_WORKING";
  const isCorrection = lead.subStatus === "QUOTATION_CORRECTION";
  const isCompleted = lead.subStatus === "QUOTATION_COMPLETED";

  return (
    <Card
      className={`group overflow-hidden border transition-all hover:shadow-md ${
        isWorking || isCorrection
          ? "border-amber-300/80 bg-gradient-to-br from-amber-500/5 to-orange-500/5 dark:border-amber-700/50"
          : isCompleted
          ? "border-emerald-300/80 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 dark:border-emerald-700/50"
          : "border-border/70 hover:border-primary/40 bg-card"
      }`}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <Link
                href={`/quotation-team/leads/${lead.id}`}
                className="font-bold text-sm text-foreground hover:text-primary hover:underline line-clamp-1"
                title={lead.name}
              >
                {lead.name}
              </Link>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge
                  variant={isCompleted ? "default" : isWorking ? "secondary" : "outline"}
                  className="text-[10px] px-1.5 py-0"
                >
                  {formatLabel(lead.subStatus)}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Lead Metadata */}
        <div className="text-xs space-y-1 text-muted-foreground pt-1 border-t border-border/40">
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-foreground">Assigned:</span>
            </span>
            <span className="font-bold text-foreground">
              {lead.assignedAt
                ? new Date(lead.assignedAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "Not set"}
            </span>
          </div>

          {lead.location && (
            <div className="flex items-center gap-1 truncate text-[11px]" title={lead.location}>
              <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{lead.location}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] pt-1">
            <span className="text-muted-foreground">Area Sqft:</span>
            <span className="font-semibold text-foreground">
              Short: {lead.avgShortSqft || 0} | Detail: {lead.avgDetailSqft || 0}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1 border-t border-border/40">
          <Button asChild size="sm" variant={isWorking ? "default" : "outline"} className="flex-1 h-8 text-xs">
            <Link href={`/quotation-team/leads/${lead.id}`}>
              {isWorking ? "Quotation Studio" : "Open Workspace"}
            </Link>
          </Button>

          {lead.canStart && (
            <Button
              size="sm"
              variant="outline"
              disabled={busyId === lead.id}
              onClick={() => onStartWork(lead.id)}
              className="h-8 text-xs"
            >
              Start Work
            </Button>
          )}

          {lead.canSubmit && (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 text-xs font-semibold"
              onClick={() => onSubmitWork(lead)}
            >
              Submit
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
