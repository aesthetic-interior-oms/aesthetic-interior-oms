'use client'

import { useEffect, useState } from 'react'
import { CrmPageHeader } from '@/components/crm/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, MapPin, Clock, User, Search, Loader2, AlertCircle, CheckCircle2, Ban } from 'lucide-react'

/* ────────────────── Types ────────────────── */
type VisitStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED'

type PartialVisitRecord = {
  id: string
  scheduledAt: string
  location: string
  visitType: string
  status: VisitStatus
  notes: string | null
  visitFee?: number | null
  projectSqft?: number | null
  projectStatus?: string | null
  lead: {
    id: string
    name: string
    phone: string
    location: string | null
  }
  assignedTo: {
    id: string
    fullName: string
    email: string
    phone?: string | null
  } | null
}

/* ────────────────── Helpers ────────────────── */
function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-BD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStatusConfig(status: VisitStatus) {
  switch (status) {
    case 'SCHEDULED':
      return {
        label: 'Scheduled',
        icon: Clock,
        className: 'bg-blue-100 text-blue-700 border-blue-200',
      }
    case 'COMPLETED':
      return {
        label: 'Completed',
        icon: CheckCircle2,
        className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      }
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        icon: Ban,
        className: 'bg-red-100 text-red-700 border-red-200',
      }
    case 'RESCHEDULED':
      return {
        label: 'Rescheduled',
        icon: Calendar,
        className: 'bg-amber-100 text-amber-700 border-amber-200',
      }
    default:
      return {
        label: status,
        icon: Clock,
        className: 'bg-gray-100 text-gray-700 border-gray-200',
      }
  }
}

/* ────────────────── Component ────────────────── */
export default function PartialVisitsPage() {
  const [visits, setVisits] = useState<PartialVisitRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch('/api/visit-schedule?visitType=PARTIAL_WORK_VISIT')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setVisits(data.data)
        } else {
          setError(data.error ?? 'Failed to load partial visits')
        }
      })
      .catch(() => setError('Failed to load partial visits'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = visits.filter((v) => {
    const matchesSearch =
      !search ||
      v.lead.name.toLowerCase().includes(search.toLowerCase()) ||
      v.location.toLowerCase().includes(search.toLowerCase()) ||
      (v.assignedTo?.fullName ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const upcoming = filtered.filter((v) => v.status === 'SCHEDULED' || v.status === 'RESCHEDULED')
  const completed = filtered.filter((v) => v.status === 'COMPLETED')
  const cancelled = filtered.filter((v) => v.status === 'CANCELLED')

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <CrmPageHeader
        title="Partial Work Visits"
        subtitle="All scheduled partial work visits assigned to Specialist Design Consultants"
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client, location, or consultant..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
            <SelectItem value="RESCHEDULED">Rescheduled</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary strip */}
      {!loading && !error && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Upcoming', count: upcoming.length, color: 'text-blue-600' },
            { label: 'Completed', count: completed.length, color: 'text-emerald-600' },
            { label: 'Cancelled', count: cancelled.length, color: 'text-red-500' },
          ].map(({ label, count, color }) => (
            <div key={label} className="rounded-xl border bg-card p-4 text-center shadow-sm">
              <p className={`text-2xl font-bold ${color}`}>{count}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* State: loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading partial visits…</span>
        </div>
      )}

      {/* State: error */}
      {!loading && error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* State: empty */}
      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-16 gap-3 text-muted-foreground">
          <Calendar className="h-10 w-10 opacity-40" />
          <p className="text-sm font-medium">No partial work visits found</p>
          <p className="text-xs">Try adjusting your filters or check back later.</p>
        </div>
      )}

      {/* Visit cards */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered
            .slice()
            .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
            .map((visit) => {
              const statusCfg = getStatusConfig(visit.status)
              const StatusIcon = statusCfg.icon
              return (
                <Card key={visit.id} className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow">
                  {/* Coloured top bar */}
                  <div
                    className={`h-1 w-full ${
                      visit.status === 'COMPLETED'
                        ? 'bg-emerald-500'
                        : visit.status === 'CANCELLED'
                          ? 'bg-red-400'
                          : visit.status === 'RESCHEDULED'
                            ? 'bg-amber-400'
                            : 'bg-blue-500'
                    }`}
                  />
                  <CardContent className="p-4 space-y-3">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{visit.lead.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{visit.lead.phone}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`shrink-0 flex items-center gap-1 text-xs px-2 py-0.5 ${statusCfg.className}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {statusCfg.label}
                      </Badge>
                    </div>

                    {/* Meta rows */}
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>{formatDate(visit.scheduledAt)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{visit.location}</span>
                      </div>
                      {visit.assignedTo && (
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{visit.assignedTo.fullName}</span>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {visit.notes && (
                      <p className="text-xs text-muted-foreground bg-muted/40 rounded-md px-2.5 py-1.5 line-clamp-2">
                        {visit.notes}
                      </p>
                    )}

                    {/* Footer stats */}
                    {(visit.visitFee != null || visit.projectSqft != null) && (
                      <div className="flex gap-4 pt-1 border-t">
                        {visit.visitFee != null && (
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Fee</p>
                            <p className="text-xs font-medium">৳{visit.visitFee.toLocaleString()}</p>
                          </div>
                        )}
                        {visit.projectSqft != null && (
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Sqft</p>
                            <p className="text-xs font-medium">{visit.projectSqft.toLocaleString()}</p>
                          </div>
                        )}
                        {visit.projectStatus && (
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Project</p>
                            <p className="text-xs font-medium">{visit.projectStatus.replace(/_/g, ' ')}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
        </div>
      )}
    </div>
  )
}
