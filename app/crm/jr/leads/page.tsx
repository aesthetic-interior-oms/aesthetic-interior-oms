'use client'

import { useState } from 'react'
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
import { Plus, Search } from 'lucide-react'

const statuses = ['NEW', 'CONTACTED', 'FOLLOWUP', 'VISIT_SCHEDULED', 'REJECTED', 'CONVERTED']

const sampleLeads = [
  { id: 1, name: 'Acme Corp', phone: '+91 9876543210', status: 'NEW', project_type: 'Commercial', location: 'Mumbai' },
  { id: 2, name: 'Tech Startup', phone: '+91 9876543211', status: 'CONTACTED', project_type: 'Office', location: 'Bangalore' },
  { id: 3, name: 'Retail Store', phone: '+91 9876543212', status: 'VISIT_SCHEDULED', project_type: 'Retail', location: 'Delhi' },
  { id: 4, name: 'Hospital Group', phone: '+91 9876543213', status: 'FOLLOWUP', project_type: 'Healthcare', location: 'Chennai' },
  { id: 5, name: 'Hotel Chain', phone: '+91 9876543214', status: 'NEW', project_type: 'Hospitality', location: 'Goa' },
]

const statusColors: Record<string, string> = {
  NEW: 'bg-gray-100 text-gray-800',
  CONTACTED: 'bg-blue-100 text-blue-800',
  FOLLOWUP: 'bg-yellow-100 text-yellow-800',
  VISIT_SCHEDULED: 'bg-purple-100 text-purple-800',
  REJECTED: 'bg-red-100 text-red-800',
  CONVERTED: 'bg-green-100 text-green-800',
}

export default function LeadsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const filteredLeads = sampleLeads.filter((lead) => {
    const matchesSearch = lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.phone.includes(search)
    const matchesStatus = statusFilter === 'ALL' || lead.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const statusCounts = statuses.reduce((acc, status) => {
    acc[status] = sampleLeads.filter((l) => l.status === status).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Leads</h1>
          <p className="text-slate-600 mt-1">Manage and track all your leads</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Lead
        </Button>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statuses.map((status) => (
          <Card key={status} className="text-center">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-slate-900">{statusCounts[status]}</div>
              <p className="text-xs text-slate-600 mt-1">{status}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            {statuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leads List ({filteredLeads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Lead Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Phone</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Project Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Location</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Status</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="border-b hover:bg-slate-50">
                    <td className="py-4 px-4">{lead.name}</td>
                    <td className="py-4 px-4">{lead.phone}</td>
                    <td className="py-4 px-4">{lead.project_type}</td>
                    <td className="py-4 px-4">{lead.location}</td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[lead.status]}`}>
                        {lead.status}
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
        </CardContent>
      </Card>
    </div>
  )
}
