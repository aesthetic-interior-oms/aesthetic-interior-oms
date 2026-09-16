"use client"

import React, { useEffect, useState, useCallback } from "react"
import Link from "next/link"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Users,
  ChevronLeft,
  Loader2,
  Clock,
  CheckCircle2,
  FileText,
  Search,
  ExternalLink,
  Phone,
  Building2,
  ChevronRight,
  TrendingUp,
} from "lucide-react"

type VendorDashboardEntry = {
  vendor: {
    id: string
    vendorId: string
    vendorName: string
    vendorCompanyName: string | null
    vendorType: string
    status: string
    primaryPhone: string | null
  }
  projectCount: number
  totalAgreed: number
  totalPaid: number
  balance: number
  paidPercent: number
  hasOutstanding: boolean
  activeProjects: string[]
  workStatuses: string[]
}

type ProjectAgreementDetail = {
  id: string
  leadId: string
  agreementValue: number
  workScope: string | null
  workStatus: string
  retentionPercent: number
  retentionReleased: boolean
  totalPaid: number
  balance: number
  paidPercent: number
  lead: {
    id: string
    name: string
    stage: string
    location: string | null
  }
}

export default function VendorDashboardPage() {
  const [dashboardData, setDashboardData] = useState<VendorDashboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Detail Modal
  const [selectedVendorEntry, setSelectedVendorEntry] = useState<VendorDashboardEntry | null>(null)
  const [vendorProjects, setVendorProjects] = useState<ProjectAgreementDetail[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/vendors/dashboard")
      const json = await res.json()
      if (json.success) setDashboardData(json.data)
      else toast.error(json.error ?? "Failed to load dashboard")
    } catch {
      toast.error("Failed to load vendor dashboard")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const openVendorProjects = async (entry: VendorDashboardEntry) => {
    setSelectedVendorEntry(entry)
    setProjectsLoading(true)
    try {
      const res = await fetch(`/api/vendors/${entry.vendor.id}/projects`)
      const json = await res.json()
      if (json.success) setVendorProjects(json.data)
      else toast.error(json.error ?? "Failed to load vendor projects")
    } catch {
      toast.error("Failed to load vendor projects")
    } finally {
      setProjectsLoading(false)
    }
  }

  // Filter entries
  const filtered = dashboardData.filter((item) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return (
      item.vendor.vendorName.toLowerCase().includes(q) ||
      (item.vendor.vendorCompanyName && item.vendor.vendorCompanyName.toLowerCase().includes(q)) ||
      item.vendor.vendorId.toLowerCase().includes(q) ||
      item.vendor.vendorType.toLowerCase().includes(q)
    )
  })

  // Aggregates
  const totalAgreedAll = dashboardData.reduce((s, i) => s + i.totalAgreed, 0)
  const totalPaidAll = dashboardData.reduce((s, i) => s + i.totalPaid, 0)
  const totalAPAll = dashboardData.reduce((s, i) => s + i.balance, 0)

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Link href="/crm/admin/finance" prefetch={false} className="hover:text-foreground flex items-center gap-1 transition">
              <ChevronLeft className="w-4 h-4" /> Finance Dashboard
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Accounts Payable & Vendor Dashboard</h1>
          <p className="text-muted-foreground">Company-wide view of all vendor contracts, payments, and outstanding balances.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/crm/admin/finance/settings" prefetch={false}>
            <Button variant="outline" className="gap-2">
              <Users className="w-4 h-4" /> Master Vendors Directory
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border border-border">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Vendor Contracts</p>
              <h3 className="text-2xl font-bold mt-1">৳{totalAgreedAll.toLocaleString("en-BD")}</h3>
              <p className="text-xs text-muted-foreground mt-1">{dashboardData.length} active vendors across sites</p>
            </div>
            <div className="p-3 rounded-xl bg-primary/10 text-primary"><FileText className="w-6 h-6" /></div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Paid to Vendors</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">৳{totalPaidAll.toLocaleString("en-BD")}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {totalAgreedAll > 0 ? Math.round((totalPaidAll / totalAgreedAll) * 100) : 0}% of total contracted amount
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"><CheckCircle2 className="w-6 h-6" /></div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Total Accounts Payable (Owed)</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">৳{totalAPAll.toLocaleString("en-BD")}</h3>
              <p className="text-xs text-muted-foreground mt-1">Remaining balance owed across all projects</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"><Clock className="w-6 h-6" /></div>
          </CardContent>
        </Card>
      </div>

      {/* Main Vendor Table Card */}
      <Card className="border border-border">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
          <div>
            <CardTitle>Vendor Summary</CardTitle>
            <CardDescription>Click any vendor to view their breakdown per project.</CardDescription>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search vendor, type, code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading vendors dashboard...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              No vendors found matching your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 uppercase tracking-wider text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-3.5">Vendor</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5 text-center">Projects</th>
                    <th className="p-3.5 text-right">Total Contract</th>
                    <th className="p-3.5 text-right">Total Paid</th>
                    <th className="p-3.5 text-right">Balance (Payable)</th>
                    <th className="p-3.5 text-center">Progress</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filtered.map((item) => (
                    <tr key={item.vendor.id} className="hover:bg-muted/30 transition">
                      <td className="p-3.5 font-medium">
                        <div className="flex items-center gap-2">
                          <div>
                            <span className="font-semibold text-sm text-foreground">{item.vendor.vendorName}</span>
                            <div className="flex items-center gap-2 text-muted-foreground text-[11px] mt-0.5">
                              <Badge variant="outline" className="font-mono text-[10px] py-0 px-1">{item.vendor.vendorId}</Badge>
                              {item.vendor.vendorCompanyName && <span>{item.vendor.vendorCompanyName}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <Badge variant="secondary" className="font-semibold text-[10px]">
                          {item.vendor.vendorType.replace(/_/g, " ")}
                        </Badge>
                      </td>

                      <td className="p-3.5 text-center font-bold">{item.projectCount}</td>

                      <td className="p-3.5 text-right font-semibold">৳{item.totalAgreed.toLocaleString("en-BD")}</td>

                      <td className="p-3.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        ৳{item.totalPaid.toLocaleString("en-BD")}
                      </td>

                      <td className="p-3.5 text-right font-bold text-amber-600 dark:text-amber-400">
                        ৳{item.balance.toLocaleString("en-BD")}
                      </td>

                      <td className="p-3.5 text-center min-w-[100px]">
                        <div className="space-y-1">
                          <span className="text-[11px] font-medium">{Math.round(item.paidPercent)}%</span>
                          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${Math.min(item.paidPercent, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openVendorProjects(item)}
                          className="h-7 px-2 gap-1 text-xs"
                        >
                          View Projects <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vendor Projects Detail Dialog */}
      <Dialog open={!!selectedVendorEntry} onOpenChange={(open) => { if (!open) setSelectedVendorEntry(null) }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedVendorEntry?.vendor.vendorName} — Project Agreements</DialogTitle>
            <DialogDescription>
              {selectedVendorEntry?.vendor.vendorCompanyName ? `${selectedVendorEntry.vendor.vendorCompanyName} · ` : ""}
              {selectedVendorEntry?.vendor.vendorId}
            </DialogDescription>
          </DialogHeader>

          {projectsLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading project agreements...
            </div>
          ) : (
            <div className="space-y-4">
              {vendorProjects.map((ag) => (
                <Card key={ag.id} className="border border-border">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-base text-foreground">{ag.lead.name}</span>
                        {ag.lead.location && <p className="text-xs text-muted-foreground">{ag.lead.location}</p>}
                        {ag.workScope && <p className="text-xs text-primary font-medium mt-0.5">Scope: {ag.workScope}</p>}
                      </div>
                      <Link href={`/crm/accounts/projects/${ag.lead.id}`} target="_blank">
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                          Open Project <ExternalLink className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>

                    <div className="grid grid-cols-3 gap-3 p-2.5 rounded bg-muted/30 border border-border/40 text-xs">
                      <div>
                        <span className="text-muted-foreground">Contract Value</span>
                        <p className="font-bold text-sm mt-0.5">৳{ag.agreementValue.toLocaleString("en-BD")}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Paid so far</span>
                        <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">
                          ৳{ag.totalPaid.toLocaleString("en-BD")}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Balance Owed</span>
                        <p className="font-bold text-sm text-amber-600 dark:text-amber-400 mt-0.5">
                          ৳{ag.balance.toLocaleString("en-BD")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedVendorEntry(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
