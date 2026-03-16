'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MapPin, Clock, Calendar, CheckCircle2, AlertCircle } from 'lucide-react'

type VisitStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED'

type VisitRecord = {
  id: string
  scheduledAt: string
  location: string
  notes: string | null
  status: VisitStatus
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
    phone: string
  } | null
}

type ApiResponse = {
  success: boolean
  data?: VisitRecord[]
}

const fallbackVisits: VisitRecord[] = [
  {
    id: 'demo_visit_1',
    scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    location: 'Koregaon Park, Pune',
    notes: 'Client asked for modern living room concepts.',
    status: 'SCHEDULED',
    lead: {
      id: 'demo_lead_1',
      name: 'Priya Patel',
      phone: '+91 99999 00001',
      location: 'Koregaon Park, Pune',
    },
    assignedTo: {
      id: 'demo_user_1',
      fullName: 'Visit Team Member',
      email: 'visit1@example.com',
      phone: '+91 88888 11111',
    },
  },
  {
    id: 'demo_visit_2',
    scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    location: 'Baner, Pune',
    notes: 'Site measured successfully and layout captured.',
    status: 'COMPLETED',
    lead: {
      id: 'demo_lead_2',
      name: 'Rajesh Sharma',
      phone: '+91 99999 00002',
      location: 'Baner, Pune',
    },
    assignedTo: {
      id: 'demo_user_1',
      fullName: 'Visit Team Member',
      email: 'visit1@example.com',
      phone: '+91 88888 11111',
    },
  },
]

function formatDate(value: string) {
  return new Date(value).toLocaleDateString()
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function daysLabel(value: string) {
  const now = new Date()
  const visitDate = new Date(value)
  const diffMs = visitDate.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))

  if (diffDays <= 0) return 'today'
  if (diffDays === 1) return 'tomorrow'
  return `${diffDays} days`
}

export default function MyVisitsPage() {
  const [visits, setVisits] = useState<VisitRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<'api' | 'fallback'>('api')
  const [statusFilter, setStatusFilter] = useState<'ALL' | VisitStatus>('ALL')

  useEffect(() => {
    const loadVisits = async () => {
      try {
        const visitsRes = await fetch('/api/visit-schedule')

        if (!visitsRes.ok) {
          throw new Error('Unable to fetch visit schedule')
        }

        const payload = (await visitsRes.json()) as ApiResponse
        const data = payload.data ?? []

        if (data.length === 0) {
          setVisits(fallbackVisits)
          setSource('fallback')
          return
        }

        setVisits(data)
        setSource('api')
      } catch {
        setVisits(fallbackVisits)
        setSource('fallback')
      } finally {
        setLoading(false)
      }
    }

    loadVisits()
  }, [])

  const filteredVisits = useMemo(
    () => (statusFilter === 'ALL' ? visits : visits.filter((visit) => visit.status === statusFilter)),
    [statusFilter, visits],
  )

  const upcomingVisits = useMemo(
    () => filteredVisits.filter((visit) => visit.status === 'SCHEDULED' || visit.status === 'RESCHEDULED'),
    [filteredVisits]
  )

  const completedVisits = useMemo(
    () => filteredVisits.filter((visit) => visit.status === 'COMPLETED'),
    [filteredVisits]
  )

  const historyVisits = useMemo(
    () => filteredVisits.filter((visit) => visit.status === 'COMPLETED' || visit.status === 'CANCELLED'),
    [filteredVisits]
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Visits</h1>
        <p className="text-muted-foreground mt-1">
          Showing {source === 'api' ? 'live API data' : 'dummy fallback data'} for your assigned visits
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading visits...</div>
      ) : null}

      <div className="max-w-xs">
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
            <SelectItem value="RESCHEDULED">Rescheduled</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="bg-background border-border">
          <TabsTrigger value="upcoming" className="data-[state=active]:bg-primary">Upcoming</TabsTrigger>
          <TabsTrigger value="completed" className="data-[state=active]:bg-primary">Completed</TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-primary">History</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingVisits.map((visit) => (
            <Card key={visit.id} className="bg-card border-border">
              <CardContent className="pt-6">
                <p className="font-semibold text-lg">{visit.lead.name}</p>
                <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2"><MapPin size={16} />{visit.location}</span>
                  <span className="flex items-center gap-2"><Clock size={16} />{formatTime(visit.scheduledAt)}</span>
                  <span className="flex items-center gap-2"><Calendar size={16} />{daysLabel(visit.scheduledAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedVisits.map((visit) => (
            <Card key={visit.id} className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-green-500" />
                  <p className="font-semibold text-lg">{visit.lead.name}</p>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{formatDate(visit.scheduledAt)} at {formatTime(visit.scheduledAt)}</p>
                {visit.notes ? <p className="text-sm mt-2">{visit.notes}</p> : null}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {historyVisits.map((visit) => (
            <Card key={visit.id} className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <AlertCircle size={18} className="text-yellow-500" />
                  <p className="font-semibold text-lg">{visit.lead.name}</p>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{visit.status} • {formatDate(visit.scheduledAt)} • {visit.location}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
