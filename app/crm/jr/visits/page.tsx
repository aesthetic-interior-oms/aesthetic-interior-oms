'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, MapPin, Clock } from 'lucide-react'

const sampleVisits = [
  { id: 1, lead: 'Acme Corp', date: '2024-02-25', time: '10:00 - 11:00', location: 'Mumbai', status: 'scheduled' },
  { id: 2, lead: 'Tech Startup', date: '2024-02-25', time: '02:00 - 03:00', location: 'Bangalore', status: 'scheduled' },
  { id: 3, lead: 'Retail Store', date: '2024-02-24', time: '03:00 - 04:00', location: 'Delhi', status: 'completed' },
  { id: 4, lead: 'Hotel Chain', date: '2024-02-26', time: '11:00 - 12:00', location: 'Goa', status: 'scheduled' },
]

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  rescheduled: 'bg-yellow-100 text-yellow-800',
}

export default function VisitsPage() {
  const [activeTab, setActiveTab] = useState('calendar')

  const today = new Date().toISOString().split('T')[0]
  const scheduledVisits = sampleVisits.filter((v) => v.status === 'scheduled')
  const completedVisits = sampleVisits.filter((v) => v.status === 'completed')

  const VisitCard = ({ visit }: { visit: typeof sampleVisits[0] }) => (
    <Card className="mb-3">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">{visit.lead}</h3>
            <div className="flex flex-col gap-2 mt-3 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {visit.date} - {visit.time}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {visit.location}
              </div>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[visit.status]}`}
          >
            {visit.status.charAt(0).toUpperCase() + visit.status.slice(1)}
          </span>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Visits</h1>
          <p className="text-slate-600 mt-1">Schedule and manage site visits</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Schedule Visit
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Calendar - Coming Soon</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center font-semibold text-slate-600">
                    {day}
                  </div>
                ))}
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="aspect-square p-2 border rounded-lg text-center text-sm">
                    {i + 1 <= 28 ? i + 1 : ''}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Scheduled ({scheduledVisits.length})</h3>
              {scheduledVisits.length > 0 ? (
                scheduledVisits.map((visit) => (
                  <VisitCard key={visit.id} visit={visit} />
                ))
              ) : (
                <p className="text-slate-500">No scheduled visits</p>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Completed ({completedVisits.length})</h3>
              {completedVisits.length > 0 ? (
                completedVisits.map((visit) => (
                  <VisitCard key={visit.id} visit={visit} />
                ))
              ) : (
                <p className="text-slate-500">No completed visits</p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
