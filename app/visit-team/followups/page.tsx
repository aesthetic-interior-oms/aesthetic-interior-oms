"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Phone,
  RefreshCw,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fetchMeCached } from "@/lib/client-me";

type FollowUp = {
  id: string;
  followupDate: string;
  status: "PENDING" | "DONE" | "LATELY_DONE" | "MISSED";
  notes: string | null;
  lead: { id: string; name: string; phone: string; stage: string };
};

const statusClass: Record<FollowUp["status"], string> = {
  PENDING:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  DONE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  LATELY_DONE:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  MISSED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
};

function dateKey(date: Date | string) {
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export default function SpecialistFollowupsPage() {
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedFollowup, setSelectedFollowup] = useState<FollowUp | null>(null);
  const [completionType, setCompletionType] = useState<"next" | "closed">("next");
  const [remarks, setRemarks] = useState("");
  const [nextFollowupDate, setNextFollowupDate] = useState("");
  const [completing, setCompleting] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);

  const loadFollowups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await fetchMeCached();
      if (!me.id) throw new Error("Could not identify your user account.");
      setCurrentUserId(me.id);
      const from = new Date(
        month.getFullYear(),
        month.getMonth(),
        1,
      ).toISOString();
      const to = new Date(
        month.getFullYear(),
        month.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      ).toISOString();
      const params = new URLSearchParams({
        assignedToId: me.id,
        from,
        to,
        limit: "100",
      });
      const response = await fetch(`/api/followup?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok || !data.success)
        throw new Error(data.error || "Unable to load follow-ups.");
      setFollowups(data.data || []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load follow-ups.",
      );
      setFollowups([]);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    loadFollowups();
  }, [loadFollowups]);

  const openCompleteModal = (followup: FollowUp) => {
    setSelectedFollowup(followup);
    setCompletionType("next");
    setRemarks("");
    setNextFollowupDate("");
    setCompletionError(null);
  };

  const handleComplete = async () => {
    if (!selectedFollowup || !currentUserId) return;

    const trimmedRemarks = remarks.trim();
    if (!trimmedRemarks) {
      setCompletionError("Remarks are required to complete a follow-up.");
      return;
    }
    if (completionType === "next" && !nextFollowupDate) {
      setCompletionError("Please select the next follow-up date and time.");
      return;
    }

    setCompleting(true);
    setCompletionError(null);
    const completedStatus = selectedFollowup.status === "MISSED" ? "LATELY_DONE" : "DONE";

    try {
      const completeResponse = await fetch(
        `/api/followup/${selectedFollowup.lead.id}/${selectedFollowup.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: completedStatus,
            notes: trimmedRemarks,
            userId: currentUserId,
          }),
        },
      );
      const completeData = await completeResponse.json();
      if (!completeResponse.ok || !completeData.success) {
        throw new Error(completeData.error || "Unable to complete the follow-up.");
      }

      if (completionType === "closed") {
        const closeResponse = await fetch(`/api/lead/${selectedFollowup.lead.id}/stage`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stage: "CLOSED",
            subStatus: "PROJECT_DROPPED",
            reason: trimmedRemarks,
          }),
        });
        const closeData = await closeResponse.json();
        if (!closeResponse.ok || !closeData.success) {
          throw new Error(closeData.error || "Unable to close the lead.");
        }
      } else {
        const nextResponse = await fetch(`/api/followup/${selectedFollowup.lead.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assignedToId: currentUserId,
            followupDate: new Date(nextFollowupDate).toISOString(),
            notes: trimmedRemarks,
            userId: currentUserId,
          }),
        });
        const nextData = await nextResponse.json();
        if (!nextResponse.ok || !nextData.success) {
          throw new Error(nextData.error || "Unable to schedule the next follow-up.");
        }
      }

      setSelectedFollowup(null);
      await loadFollowups();
    } catch (completionError) {
      setCompletionError(
        completionError instanceof Error
          ? completionError.message
          : "Unable to complete the follow-up.",
      );
    } finally {
      setCompleting(false);
    }
  };

  const groupedFollowups = useMemo(() => {
    const grouped = new Map<string, FollowUp[]>();
    followups.forEach((followup) => {
      const key = dateKey(followup.followupDate);
      grouped.set(key, [...(grouped.get(key) || []), followup]);
    });
    return grouped;
  }, [followups]);
  const selected = groupedFollowups.get(selectedDate) || [];
  const firstDayOffset = month.getDay();
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const calendarDays = Array.from(
    { length: firstDayOffset + daysInMonth },
    (_, index) => (index < firstDayOffset ? null : index - firstDayOffset + 1),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-4 border-b pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/visit-team/partial-visits" className="hover:underline">
              Partial visits
            </Link>
            <span>/</span>
            <span>Follow-ups</span>
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <CalendarDays className="h-6 w-6 text-violet-600" /> My follow-up
            calendar
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            See the follow-ups assigned to you and plan each day&apos;s client
            calls.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadFollowups}
          disabled={loading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.9fr)]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 border-b py-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
              }
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-base">
              {month.toLocaleDateString("en-BD", {
                month: "long",
                year: "numeric",
              })}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
              }
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent className="p-3 sm:p-5">
            <div className="grid grid-cols-7 text-center text-xs font-semibold text-muted-foreground">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div className="py-2" key={day}>
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                if (!day) return <div key={`blank-${index}`} />;
                const value = new Date(
                  month.getFullYear(),
                  month.getMonth(),
                  day,
                );
                const key = dateKey(value);
                const count = groupedFollowups.get(key)?.length || 0;
                const isSelected = key === selectedDate;
                const isToday = key === dateKey(new Date());
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDate(key)}
                    className={`min-h-16 rounded-md border p-1 text-left transition sm:min-h-20 ${isSelected ? "border-violet-600 bg-violet-50 ring-1 ring-violet-600 dark:bg-violet-950/30" : "border-transparent hover:bg-muted"} ${isToday ? "font-bold text-violet-700 dark:text-violet-300" : ""}`}
                  >
                    <span className="block px-1 text-sm">{day}</span>
                    {count > 0 ? (
                      <span className="mx-1 mt-1 inline-flex rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {count} follow-up{count > 1 ? "s" : ""}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader className="border-b py-4">
            <CardTitle className="text-base">
              {new Date(`${selectedDate}T12:00:00`).toLocaleDateString(
                "en-BD",
                { weekday: "long", day: "numeric", month: "long" },
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
              </div>
            ) : error ? (
              <p className="py-6 text-center text-sm text-destructive">
                {error}
              </p>
            ) : selected.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No follow-ups scheduled for this day.
              </p>
            ) : (
              selected.map((followup) => (
                <div key={followup.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/visit-team/leads/${followup.lead.id}`}
                      className="font-semibold hover:underline"
                    >
                      {followup.lead.name}
                    </Link>
                    <Badge className={statusClass[followup.status]}>
                      {followup.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(followup.followupDate).toLocaleTimeString(
                      "en-BD",
                      { hour: "numeric", minute: "2-digit" },
                    )}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    {followup.lead.phone || "No phone number"}
                  </p>
                  {followup.notes ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {followup.notes}
                    </p>
                  ) : null}
                  {followup.status === "PENDING" || followup.status === "MISSED" ? (
                    <Button
                      className="mt-3 w-full"
                      size="sm"
                      onClick={() => openCompleteModal(followup)}
                    >
                      Complete follow-up
                    </Button>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={selectedFollowup !== null}
        onOpenChange={(open) => !open && !completing && setSelectedFollowup(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete follow-up</DialogTitle>
            <DialogDescription>
              Choose whether to schedule another follow-up or close this lead as cancelled.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={completionType === "next" ? "default" : "outline"}
                onClick={() => setCompletionType("next")}
                disabled={completing}
              >
                Create next follow-up
              </Button>
              <Button
                type="button"
                variant={completionType === "closed" ? "destructive" : "outline"}
                onClick={() => setCompletionType("closed")}
                disabled={completing}
              >
                Close lead
              </Button>
            </div>

            {completionType === "next" ? (
              <div className="space-y-2">
                <Label htmlFor="next-followup-date">Next follow-up date and time</Label>
                <Input
                  id="next-followup-date"
                  type="datetime-local"
                  value={nextFollowupDate}
                  onChange={(event) => setNextFollowupDate(event.target.value)}
                  disabled={completing}
                />
              </div>
            ) : (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                This will mark the lead as closed (project dropped). No new follow-up will be created.
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="completion-remarks">Remarks</Label>
              <Textarea
                id="completion-remarks"
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                placeholder="Add the outcome or reason for closing the lead..."
                rows={4}
                disabled={completing}
              />
            </div>
            {completionError ? <p className="text-sm text-destructive">{completionError}</p> : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedFollowup(null)}
              disabled={completing}
            >
              Cancel
            </Button>
            <Button
              variant={completionType === "closed" ? "destructive" : "default"}
              onClick={handleComplete}
              disabled={completing}
            >
              {completing ? "Saving..." : completionType === "closed" ? "Close lead" : "Complete & schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
