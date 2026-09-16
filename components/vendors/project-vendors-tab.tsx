"use client"

import React, { useEffect, useState, useCallback } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  PlusCircle,
  Trash2,
  Users,
  Pencil,
  Loader2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  History,
  CheckCircle2,
  Clock,
  Calendar,
  CreditCard,
  Building2,
  FileText,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
} from "lucide-react"

// Types
type Vendor = {
  id: string
  vendorId: string
  vendorName: string
  vendorCompanyName: string | null
  vendorType: string
  status: string
}

type Milestone = {
  id: string
  title: string
  amount: number
  dueDate: string | null
  isPaid: boolean
  paidAt: string | null
  notes: string | null
}

type Payment = {
  id: string
  amount: number
  paymentDate: string
  paymentMethod: string
  note: string | null
  milestone: { id: string; title: string } | null
  transaction: { id: string; voucherNo: string | null; serialNo: number } | null
}

type Revision = {
  id: string
  oldValue: number
  newValue: number
  changeReason: string
  changedAt: string
}

type VendorAgreement = {
  id: string
  vendorId: string
  leadId: string
  agreementValue: number
  workScope: string | null
  workStatus: "NOT_STARTED" | "IN_PROGRESS" | "WORK_DONE" | "CLOSED"
  retentionPercent: number
  retentionReleased: boolean
  notes: string | null
  totalPaid: number
  balance: number
  paidPercent: number
  retentionHeld: number
  vendor: Vendor
  milestones: Milestone[]
  payments: Payment[]
  revisions: Revision[]
}

type FinanceAccount = {
  id: string
  name: string
}

const WORK_STATUS_BADGES: Record<string, { label: string; className: string }> = {
  NOT_STARTED: { label: "Not Started", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  IN_PROGRESS: { label: "In Progress", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  WORK_DONE: { label: "Work Done", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  CLOSED: { label: "Closed / Fully Paid", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
}

export default function ProjectVendorsTab({ leadId }: { leadId: string }) {
  const [agreements, setAgreements] = useState<VendorAgreement[]>([])
  const [availableVendors, setAvailableVendors] = useState<Vendor[]>([])
  const [financeAccounts, setFinanceAccounts] = useState<FinanceAccount[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignForm, setAssignForm] = useState({
    vendorId: "",
    agreementValue: "",
    workScope: "",
    retentionPercent: "0",
    notes: "",
  })
  const [assignSubmitting, setAssignSubmitting] = useState(false)

  // Payment Modal
  const [paymentAgreement, setPaymentAgreement] = useState<VendorAgreement | null>(null)
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "CASH",
    milestoneId: "",
    financeAccountId: "",
    note: "",
    paymentDate: new Date().toISOString().split("T")[0],
  })
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)

  // Revision Modal
  const [revisionAgreement, setRevisionAgreement] = useState<VendorAgreement | null>(null)
  const [revisionForm, setRevisionForm] = useState({ newValue: "", changeReason: "" })
  const [revisionSubmitting, setRevisionSubmitting] = useState(false)

  // Milestone Modal
  const [milestoneAgreement, setMilestoneAgreement] = useState<VendorAgreement | null>(null)
  const [milestoneForm, setMilestoneForm] = useState({ title: "", amount: "", dueDate: "", notes: "" })
  const [milestoneSubmitting, setMilestoneSubmitting] = useState(false)

  // Detail / History Drawer
  const [detailAgreement, setDetailAgreement] = useState<VendorAgreement | null>(null)

  // Fetch Agreements & Master Vendors
  const fetchAgreements = useCallback(async () => {
    setLoading(true)
    try {
      const [agRes, venRes, accRes] = await Promise.all([
        fetch(`/api/vendors/agreements?leadId=${leadId}`),
        fetch("/api/vendors"),
        fetch("/api/finance/accounts"),
      ])
      const [agData, venData, accData] = await Promise.all([agRes.json(), venRes.json(), accRes.json()])

      if (agData.success) setAgreements(agData.data)
      if (venData.success) setAvailableVendors(venData.data.filter((v: Vendor) => v.status === "ACTIVE"))
      if (accData.success) setFinanceAccounts(accData.data)
    } catch {
      toast.error("Failed to load project vendors")
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    fetchAgreements()
  }, [fetchAgreements])

  // Assign Vendor Submit
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignForm.vendorId) { toast.error("Please select a vendor"); return }
    if (!assignForm.agreementValue || parseFloat(assignForm.agreementValue) <= 0) {
      toast.error("Enter a valid contract agreement value")
      return
    }

    setAssignSubmitting(true)
    try {
      const res = await fetch("/api/vendors/agreements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          vendorId: assignForm.vendorId,
          agreementValue: parseFloat(assignForm.agreementValue),
          workScope: assignForm.workScope,
          retentionPercent: parseFloat(assignForm.retentionPercent || "0"),
          notes: assignForm.notes,
        }),
      })
      const json = await res.json()
      if (!json.success) { toast.error(json.error ?? "Failed to assign vendor"); return }
      toast.success("Vendor agreement created!")
      setShowAssignModal(false)
      setAssignForm({ vendorId: "", agreementValue: "", workScope: "", retentionPercent: "0", notes: "" })
      fetchAgreements()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setAssignSubmitting(false)
    }
  }

  // Update Work Status
  const handleWorkStatusChange = async (agreementId: string, workStatus: string) => {
    try {
      const res = await fetch(`/api/vendors/agreements/${agreementId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workStatus }),
      })
      const json = await res.json()
      if (!json.success) { toast.error(json.error ?? "Failed to update work status"); return }
      toast.success("Work status updated!")
      fetchAgreements()
    } catch {
      toast.error("Failed to update work status")
    }
  }

  // Toggle Retention Release
  const handleToggleRetention = async (ag: VendorAgreement) => {
    try {
      const res = await fetch(`/api/vendors/agreements/${ag.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retentionReleased: !ag.retentionReleased }),
      })
      const json = await res.json()
      if (!json.success) { toast.error(json.error ?? "Failed to update retention"); return }
      toast.success(ag.retentionReleased ? "Retention status reset to held" : "Retention amount marked as released!")
      fetchAgreements()
    } catch {
      toast.error("Failed to update retention")
    }
  }

  // Submit Payment
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentAgreement) return
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast.error("Please enter a valid payment amount")
      return
    }

    setPaymentSubmitting(true)
    try {
      const res = await fetch(`/api/vendors/agreements/${paymentAgreement.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(paymentForm.amount),
          paymentMethod: paymentForm.paymentMethod,
          milestoneId: paymentForm.milestoneId || null,
          financeAccountId: paymentForm.financeAccountId || null,
          note: paymentForm.note,
          paymentDate: paymentForm.paymentDate,
        }),
      })
      const json = await res.json()
      if (!json.success) { toast.error(json.error ?? "Failed to record payment"); return }
      toast.success("Vendor payment recorded & expense logged!")
      setPaymentAgreement(null)
      setPaymentForm({
        amount: "",
        paymentMethod: "CASH",
        milestoneId: "",
        financeAccountId: "",
        note: "",
        paymentDate: new Date().toISOString().split("T")[0],
      })
      fetchAgreements()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setPaymentSubmitting(false)
    }
  }

  // Submit Revision
  const handleRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!revisionAgreement) return
    if (!revisionForm.newValue || parseFloat(revisionForm.newValue) <= 0) {
      toast.error("Please enter a valid new agreement value")
      return
    }
    if (!revisionForm.changeReason.trim()) {
      toast.error("Reason for value change is required")
      return
    }

    setRevisionSubmitting(true)
    try {
      const res = await fetch(`/api/vendors/agreements/${revisionAgreement.id}/revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newValue: parseFloat(revisionForm.newValue),
          changeReason: revisionForm.changeReason,
        }),
      })
      const json = await res.json()
      if (!json.success) { toast.error(json.error ?? "Failed to revise agreement"); return }
      toast.success("Agreement value revised & logged!")
      setRevisionAgreement(null)
      setRevisionForm({ newValue: "", changeReason: "" })
      fetchAgreements()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setRevisionSubmitting(false)
    }
  }

  // Submit Milestone
  const handleMilestoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!milestoneAgreement) return
    if (!milestoneForm.title.trim()) { toast.error("Title is required"); return }
    if (!milestoneForm.amount || parseFloat(milestoneForm.amount) <= 0) {
      toast.error("Enter a valid milestone amount")
      return
    }

    setMilestoneSubmitting(true)
    try {
      const res = await fetch(`/api/vendors/agreements/${milestoneAgreement.id}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: milestoneForm.title,
          amount: parseFloat(milestoneForm.amount),
          dueDate: milestoneForm.dueDate || null,
          notes: milestoneForm.notes,
        }),
      })
      const json = await res.json()
      if (!json.success) { toast.error(json.error ?? "Failed to add milestone"); return }
      toast.success("Milestone created!")
      setMilestoneAgreement(null)
      setMilestoneForm({ title: "", amount: "", dueDate: "", notes: "" })
      fetchAgreements()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setMilestoneSubmitting(false)
    }
  }

  // Delete Payment
  const handleDeletePayment = async (paymentId: string) => {
    try {
      const res = await fetch(`/api/vendors/payments/${paymentId}`, { method: "DELETE" })
      const json = await res.json()
      if (!json.success) { toast.error(json.error ?? "Failed to delete payment"); return }
      toast.success("Payment deleted & expense reversed")
      fetchAgreements()
      if (detailAgreement) {
        setDetailAgreement((prev) => prev ? {
          ...prev,
          payments: prev.payments.filter((p) => p.id !== paymentId)
        } : null)
      }
    } catch {
      toast.error("Failed to delete payment")
    }
  }

  // Summary statistics
  const totalAgreementsValue = agreements.reduce((s, a) => s + a.agreementValue, 0)
  const totalAgreementsPaid = agreements.reduce((s, a) => s + a.totalPaid, 0)
  const totalAccountsPayable = agreements.reduce((s, a) => s + a.balance, 0)

  // Unassigned master vendors for dropdown
  const assignedVendorIds = new Set(agreements.map((a) => a.vendorId))
  const unassignedVendors = availableVendors.filter((v) => !assignedVendorIds.has(v.id))

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Project Vendors & Accounts Payable
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage vendor contracts, milestones, and payments for this project.
          </p>
        </div>
        <Button onClick={() => setShowAssignModal(true)} className="gap-2 shrink-0">
          <PlusCircle className="w-4 h-4" /> Assign Vendor
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Total Vendor Contracts</p>
              <h3 className="text-xl font-bold mt-1">৳{totalAgreementsValue.toLocaleString("en-BD")}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{agreements.length} vendor agreement{agreements.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary"><FileText className="w-5 h-5" /></div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Total Paid to Vendors</p>
              <h3 className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">৳{totalAgreementsPaid.toLocaleString("en-BD")}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {totalAgreementsValue > 0 ? Math.round((totalAgreementsPaid / totalAgreementsValue) * 100) : 0}% of contract total
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"><CheckCircle2 className="w-5 h-5" /></div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase">Accounts Payable (Owed)</p>
              <h3 className="text-xl font-bold mt-1 text-amber-600 dark:text-amber-400">৳{totalAccountsPayable.toLocaleString("en-BD")}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Remaining outstanding balance</p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"><Clock className="w-5 h-5" /></div>
          </CardContent>
        </Card>
      </div>

      {/* Agreements List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading vendor agreements...
        </div>
      ) : agreements.length === 0 ? (
        <Card className="border border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center gap-3">
            <Users className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-muted-foreground font-medium">No vendors assigned to this project yet.</p>
            <Button onClick={() => setShowAssignModal(true)} variant="outline" className="gap-2 mt-1">
              <PlusCircle className="w-4 h-4" /> Assign First Vendor
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {agreements.map((ag) => {
            const statusConfig = WORK_STATUS_BADGES[ag.workStatus] ?? WORK_STATUS_BADGES.NOT_STARTED
            return (
              <Card key={ag.id} className="border border-border overflow-hidden">
                <CardHeader className="bg-muted/30 pb-4 border-b border-border/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-lg">{ag.vendor.vendorName}</span>
                        {ag.vendor.vendorCompanyName && (
                          <span className="text-xs text-muted-foreground font-medium">({ag.vendor.vendorCompanyName})</span>
                        )}
                        <Badge variant="outline" className="text-xs font-mono">{ag.vendor.vendorId}</Badge>
                        <Badge className="text-xs font-semibold">{ag.vendor.vendorType.replace(/_/g, " ")}</Badge>
                      </div>
                      {ag.workScope && <p className="text-xs text-muted-foreground">{ag.workScope}</p>}
                    </div>

                    {/* Work status selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground hidden sm:inline">Status:</span>
                      <Select value={ag.workStatus} onValueChange={(val) => handleWorkStatusChange(ag.id, val)}>
                        <SelectTrigger className="h-8 text-xs w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                          <SelectItem value="WORK_DONE">Work Done</SelectItem>
                          <SelectItem value="CLOSED">Closed / Fully Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-5">
                  {/* Financial Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 rounded-lg bg-muted/20 border border-border/40 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground">Contract Value</span>
                      <p className="font-bold text-base mt-0.5">৳{ag.agreementValue.toLocaleString("en-BD")}</p>
                      {ag.revisions.length > 0 && (
                        <button
                          onClick={() => setDetailAgreement(ag)}
                          className="text-[11px] text-primary hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <History className="w-3 h-3" /> {ag.revisions.length} revision{ag.revisions.length > 1 ? "s" : ""}
                        </button>
                      )}
                    </div>

                    <div>
                      <span className="text-xs text-muted-foreground">Paid so far</span>
                      <p className="font-bold text-base text-emerald-600 dark:text-emerald-400 mt-0.5">
                        ৳{ag.totalPaid.toLocaleString("en-BD")}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{Math.round(ag.paidPercent)}% paid</p>
                    </div>

                    <div>
                      <span className="text-xs text-muted-foreground">Balance (Payable)</span>
                      <p className="font-bold text-base text-amber-600 dark:text-amber-400 mt-0.5">
                        ৳{ag.balance.toLocaleString("en-BD")}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {ag.balance > 0 ? "Pending payment" : "Fully cleared"}
                      </p>
                    </div>

                    <div>
                      <span className="text-xs text-muted-foreground">Retention ({ag.retentionPercent}%)</span>
                      <p className="font-bold text-base mt-0.5">
                        ৳{ag.retentionHeld.toLocaleString("en-BD")}
                      </p>
                      <button
                        onClick={() => handleToggleRetention(ag)}
                        className={`text-[11px] font-semibold mt-0.5 flex items-center gap-1 hover:underline ${
                          ag.retentionReleased ? "text-emerald-600" : "text-amber-600"
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        {ag.retentionReleased ? "Released" : "Held (Click to Release)"}
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground font-medium">
                      <span>Payment Progress</span>
                      <span>{Math.round(ag.paidPercent)}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(ag.paidPercent, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Milestones preview */}
                  {ag.milestones.length > 0 && (
                    <div className="space-y-2 border-t border-border/50 pt-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                        <span>Payment Milestones ({ag.milestones.filter((m) => m.isPaid).length}/{ag.milestones.length} paid)</span>
                        <button onClick={() => setMilestoneAgreement(ag)} className="text-primary hover:underline">
                          + Add Milestone
                        </button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                        {ag.milestones.map((m) => (
                          <div
                            key={m.id}
                            className={`p-2.5 rounded border text-xs flex items-center justify-between ${
                              m.isPaid
                                ? "bg-emerald-50/50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-300"
                                : "bg-card border-border"
                            }`}
                          >
                            <div>
                              <p className="font-semibold">{m.title}</p>
                              <p className="text-muted-foreground font-mono mt-0.5">৳{m.amount.toLocaleString("en-BD")}</p>
                            </div>
                            <Badge variant={m.isPaid ? "default" : "outline"} className={m.isPaid ? "bg-emerald-600 text-xs" : "text-xs"}>
                              {m.isPaid ? "Paid" : "Pending"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                    <Button
                      size="sm"
                      onClick={() => {
                        setPaymentAgreement(ag)
                        setPaymentForm((f) => ({ ...f, amount: ag.balance > 0 ? String(ag.balance) : "" }))
                      }}
                      className="gap-1.5 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CreditCard className="w-3.5 h-3.5" /> Record Payment
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setMilestoneAgreement(ag)}
                      className="gap-1.5 h-8 text-xs"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Add Milestone
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRevisionAgreement(ag)
                        setRevisionForm({ newValue: String(ag.agreementValue), changeReason: "" })
                      }}
                      className="gap-1.5 h-8 text-xs"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Revise Contract
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDetailAgreement(ag)}
                      className="gap-1.5 h-8 text-xs ml-auto"
                    >
                      <History className="w-3.5 h-3.5" /> View Payments & Logs ({ag.payments.length})
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Assign Vendor Modal ── */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Vendor to Project</DialogTitle>
            <DialogDescription>Select a vendor from your master list and define the contract agreement value.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Select Vendor <span className="text-destructive">*</span></Label>
              <Select value={assignForm.vendorId} onValueChange={(v) => setAssignForm((f) => ({ ...f, vendorId: v }))}>
                <SelectTrigger><SelectValue placeholder="Choose a vendor" /></SelectTrigger>
                <SelectContent>
                  {unassignedVendors.length === 0 ? (
                    <SelectItem value="_empty" disabled>All active vendors are already assigned</SelectItem>
                  ) : (
                    unassignedVendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.vendorName} ({v.vendorType.replace(/_/g, " ")}) — {v.vendorId}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Contract Agreement Value (BDT) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                placeholder="e.g. 150000"
                value={assignForm.agreementValue}
                onChange={(e) => setAssignForm((f) => ({ ...f, agreementValue: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Retention (% Hold-back)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 10"
                  value={assignForm.retentionPercent}
                  onChange={(e) => setAssignForm((f) => ({ ...f, retentionPercent: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Work Scope</Label>
                <Input
                  placeholder="e.g. Master Bedroom Carpenter"
                  value={assignForm.workScope}
                  onChange={(e) => setAssignForm((f) => ({ ...f, workScope: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional contract terms or notes..."
                value={assignForm.notes}
                onChange={(e) => setAssignForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAssignModal(false)}>Cancel</Button>
              <Button type="submit" disabled={assignSubmitting} className="gap-2">
                {assignSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                Assign Vendor
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Record Payment Modal ── */}
      <Dialog open={!!paymentAgreement} onOpenChange={(open) => { if (!open) setPaymentAgreement(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Vendor Payment</DialogTitle>
            <DialogDescription>
              Pay {paymentAgreement?.vendor.vendorName}. This automatically creates an expense Transaction under this project.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Amount (BDT) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                placeholder="e.g. 50000"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
              />
              {paymentAgreement && (
                <p className="text-xs text-muted-foreground">
                  Current Balance Owed: <strong>৳{paymentAgreement.balance.toLocaleString("en-BD")}</strong>
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentForm.paymentMethod} onValueChange={(v) => setPaymentForm((f) => ({ ...f, paymentMethod: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                    <SelectItem value="MOBILE_BANKING">Mobile Banking</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Payment Date</Label>
                <Input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, paymentDate: e.target.value }))}
                />
              </div>
            </div>

            {/* Optional Milestone link */}
            {paymentAgreement && paymentAgreement.milestones.filter((m) => !m.isPaid).length > 0 && (
              <div className="space-y-2">
                <Label>Link to Milestone <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                <Select value={paymentForm.milestoneId} onValueChange={(v) => setPaymentForm((f) => ({ ...f, milestoneId: v }))}>
                  <SelectTrigger><SelectValue placeholder="None (General Payment)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None (General Payment)</SelectItem>
                    {paymentAgreement.milestones.filter((m) => !m.isPaid).map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.title} — ৳{m.amount.toLocaleString("en-BD")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Optional Finance Account link */}
            {financeAccounts.length > 0 && (
              <div className="space-y-2">
                <Label>Pay From Account <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                <Select value={paymentForm.financeAccountId} onValueChange={(v) => setPaymentForm((f) => ({ ...f, financeAccountId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {financeAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Note / Voucher Ref</Label>
              <Input
                placeholder="e.g. Part payment for stage 1"
                value={paymentForm.note}
                onChange={(e) => setPaymentForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPaymentAgreement(null)}>Cancel</Button>
              <Button type="submit" disabled={paymentSubmitting} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                {paymentSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                Confirm & Record Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Revise Agreement Contract Modal ── */}
      <Dialog open={!!revisionAgreement} onOpenChange={(open) => { if (!open) setRevisionAgreement(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Revise Vendor Contract Value</DialogTitle>
            <DialogDescription>
              Increase or decrease contract value for {revisionAgreement?.vendor.vendorName}. All revisions are logged in audit trail.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRevisionSubmit} className="space-y-4">
            <div className="space-y-1 p-3 bg-muted/40 rounded border text-xs space-y-1">
              <p>Current Value: <strong>৳{revisionAgreement?.agreementValue.toLocaleString("en-BD")}</strong></p>
              <p>Total Paid: <strong>৳{revisionAgreement?.totalPaid.toLocaleString("en-BD")}</strong></p>
            </div>

            <div className="space-y-2">
              <Label>New Contract Value (BDT) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                placeholder="Enter new total value"
                value={revisionForm.newValue}
                onChange={(e) => setRevisionForm((f) => ({ ...f, newValue: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Reason for Change <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="e.g. Scope expanded to include dining room wood work..."
                value={revisionForm.changeReason}
                onChange={(e) => setRevisionForm((f) => ({ ...f, changeReason: e.target.value }))}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRevisionAgreement(null)}>Cancel</Button>
              <Button type="submit" disabled={revisionSubmitting} className="gap-2">
                {revisionSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                Save Value Revision
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Add Milestone Modal ── */}
      <Dialog open={!!milestoneAgreement} onOpenChange={(open) => { if (!open) setMilestoneAgreement(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Payment Milestone</DialogTitle>
            <DialogDescription>
              Set up a milestone installment for {milestoneAgreement?.vendor.vendorName}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMilestoneSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Milestone Title <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Advance 30% / Framework complete"
                value={milestoneForm.title}
                onChange={(e) => setMilestoneForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (BDT) <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  placeholder="e.g. 45000"
                  value={milestoneForm.amount}
                  onChange={(e) => setMilestoneForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={milestoneForm.dueDate}
                  onChange={(e) => setMilestoneForm((f) => ({ ...f, dueDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                placeholder="e.g. Payable upon site verification"
                value={milestoneForm.notes}
                onChange={(e) => setMilestoneForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMilestoneAgreement(null)}>Cancel</Button>
              <Button type="submit" disabled={milestoneSubmitting} className="gap-2">
                {milestoneSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                Add Milestone
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Payments & Revisions Log Dialog ── */}
      <Dialog open={!!detailAgreement} onOpenChange={(open) => { if (!open) setDetailAgreement(null) }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailAgreement?.vendor.vendorName} — Contract History & Payments</DialogTitle>
            <DialogDescription>Full record of payments and contract value revisions.</DialogDescription>
          </DialogHeader>

          {detailAgreement && (
            <div className="space-y-6">
              {/* Payment History */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center justify-between">
                  <span>Payment History ({detailAgreement.payments.length})</span>
                  <span className="text-emerald-600 font-bold">Total Paid: ৳{detailAgreement.totalPaid.toLocaleString("en-BD")}</span>
                </h4>

                {detailAgreement.payments.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center border border-dashed rounded">No payments recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {detailAgreement.payments.map((p) => (
                      <div key={p.id} className="p-3 rounded border border-border bg-card flex items-center justify-between gap-3 text-xs">
                        <div>
                          <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400">৳{p.amount.toLocaleString("en-BD")}</p>
                          <div className="flex items-center gap-2 text-muted-foreground mt-0.5">
                            <span>{new Date(p.paymentDate).toLocaleDateString("en-GB")}</span>
                            <span>•</span>
                            <Badge variant="outline" className="text-[10px]">{p.paymentMethod.replace(/_/g, " ")}</Badge>
                            {p.milestone && (
                              <span className="text-primary font-medium">({p.milestone.title})</span>
                            )}
                          </div>
                          {p.note && <p className="text-muted-foreground mt-1 italic">{p.note}</p>}
                        </div>

                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeletePayment(p.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Revision History */}
              <div className="space-y-3 border-t border-border pt-4">
                <h4 className="text-sm font-semibold">Contract Revision Log ({detailAgreement.revisions.length})</h4>
                {detailAgreement.revisions.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center border border-dashed rounded">No contract value revisions recorded.</p>
                ) : (
                  <div className="space-y-2">
                    {detailAgreement.revisions.map((r) => (
                      <div key={r.id} className="p-3 rounded border border-border bg-muted/20 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground line-through">৳{r.oldValue.toLocaleString("en-BD")}</span>
                            <ChevronRight className="w-3 h-3 text-muted-foreground" />
                            <span className="font-bold text-primary">৳{r.newValue.toLocaleString("en-BD")}</span>
                          </div>
                          <span className="text-muted-foreground text-[11px]">{new Date(r.changedAt).toLocaleDateString("en-GB")}</span>
                        </div>
                        <p className="text-muted-foreground">Reason: {r.changeReason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailAgreement(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
