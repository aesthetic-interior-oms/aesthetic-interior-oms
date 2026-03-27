'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'
import {
  CircleDot,
  PhoneCall,
  Handshake,
  Sprout,
  CalendarCheck,
  CheckCircle2,
  Archive,
} from 'lucide-react'
import LeadCreateModal from '../../../../components/crm/junior/LeadCreateModal'
import { CrmPageHeader } from '@/components/crm/shared/page-header'

const stages = ['NEW', 'NUMBER_COLLECTED', 'CONTACT_ATTEMPTED', 'NURTURING', 'VISIT_SCHEDULED', 'VISIT_COMPLETED', 'CLOSED']

const stageColors: Record<string, string> = {
  NEW: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100',
  NUMBER_COLLECTED: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200',
  CONTACT_ATTEMPTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  NURTURING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
  VISIT_SCHEDULED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
  VISIT_COMPLETED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200',
  CLOSED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
}
const stageStatConfig: Record<string, { icon: typeof CircleDot; tint: string }> = {
  NEW: { icon: CircleDot, tint: 'text-slate-600 bg-slate-100 dark:bg-slate-900/40 dark:text-slate-200' },
  NUMBER_COLLECTED: { icon: PhoneCall, tint: 'text-cyan-700 bg-cyan-100 dark:bg-cyan-900/40 dark:text-cyan-200' },
  CONTACT_ATTEMPTED: { icon: Handshake, tint: 'text-blue-700 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-200' },
  NURTURING: { icon: Sprout, tint: 'text-yellow-700 bg-yellow-100 dark:bg-yellow-900/40 dark:text-yellow-200' },
  VISIT_SCHEDULED: { icon: CalendarCheck, tint: 'text-purple-700 bg-purple-100 dark:bg-purple-900/40 dark:text-purple-200' },
  VISIT_COMPLETED: { icon: CheckCircle2, tint: 'text-indigo-700 bg-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-200' },
  CLOSED: { icon: Archive, tint: 'text-green-700 bg-green-100 dark:bg-green-900/40 dark:text-green-200' },
}

type LeadSummary = {
  id: string
  name: string
  phone: string | null
  email: string | null
  stage: string
  location: string | null
  created_at: string
  assignee?: {
    id: string
    fullName: string
    email: string
  } | null
  assignments?: Array<{
    id: string
    department: string
    user: { id: string; fullName: string; email: string }
  }>
}

export default function LeadsPage() {
  console.log('LeadsPage rendered')
  const [leads, setLeads] = useState<LeadSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('ALL')

  useEffect(() => {
    fetch('/api/lead')
      .then(res => res.json())
      .then(data => {
        setLeads(data.data || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])


  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      (lead.phone || '').includes(search) ||
      (lead.email || '').toLowerCase().includes(search.toLowerCase())
    const matchesStage = stageFilter === 'ALL' || lead.stage === stageFilter
    return matchesSearch && matchesStage
  })

  const stageCounts = stages.reduce((acc, stage) => {
    acc[stage] = leads.filter((l) => l.stage === stage).length
    return acc
  }, {} as Record<string, number>)

  const refreshLeads = () => {
    setLoading(true)
    fetch('/api/lead')
      .then(res => res.json())
      .then(data => {
        setLeads(data.data || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  return (
    <div className="min-h-screen bg-background">
      <CrmPageHeader
        title="Leads"
        subtitle="Manage and track all your leads"
      />
      <main className="mx-auto max-w-[1440px] px-6 py-6">
        <div className="space-y-6">
          <div className="flex items-center justify-end">
            <LeadCreateModal onCreated={refreshLeads} />
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            {stages.map((stage) => {
              const config = stageStatConfig[stage]
              const Icon = config.icon
              return (
                <Card key={stage} className="border-border bg-card">
                  <CardContent className="flex flex-col items-center justify-center gap-2 p-4 text-center">
                    <div className={`inline-flex size-10 items-center justify-center rounded-lg ${config.tint}`}>
                      <Icon className="size-5" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">{stage.replace(/_/g, ' ')}</p>
                    <p className="text-3xl font-bold leading-tight text-foreground">{stageCounts[stage]}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-full md:w-56">
                <SelectValue placeholder="Filter by stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Stages</SelectItem>
                {stages.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {stage}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Leads List ({filteredLeads.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-muted-foreground">Loading leads...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Lead Name</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Phone</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">JR CRM</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Location</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Stage</th>
                        <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.map((lead) => (
                        <tr key={lead.id} className="border-b hover:bg-muted/50">
                          <td className="py-4 px-4">
                            <div className="font-medium text-foreground">{lead.name}</div>
                            <div className="text-xs text-muted-foreground">{lead.email}</div>
                          </td>
                          <td className="py-4 px-4">{lead.phone}</td>
                          <td className="py-4 px-4">
                            {lead.assignments?.[0]?.user?.fullName ? (
                              <div className="font-medium text-foreground">
                                {lead.assignments[0].user.fullName}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Unassigned</span>
                            )}
                          </td>
                          <td className="py-4 px-4">{lead.location || '—'}</td>
                          <td className="py-4 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${stageColors[lead.stage]}`}>
                              {lead.stage}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <Link href={`/crm/jr/leads/${lead.id}`}>
                              <Button variant="outline" size="sm">
                                View
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
