'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar,
  Phone,
  Mail,
  User,
  ArrowRight
} from 'lucide-react'

type FollowUpStatus = 'PENDING' | 'DONE' | 'LATELY_DONE' | 'MISSED'

type FollowUp = {
  id: string
  leadId: string
  assignedToId: string
  followupDate: string
  status: FollowUpStatus
  notes: string | null
  createdAt: string
  lead: {
    id: string
    name: string
    email: string
    phone: string
    stage: string
    subStatus: string | null
  }
  assignedTo: {
    id: string
    fullName: string
    email: string
  }
}

const mockFollowups: FollowUp[] = [
  {
    id: 'cmmk75l980000ruwb4bm0o7p3',
    leadId: 'cmmiyhpn20002cvwb4y1o90y7',
    assignedToId: 'cmminh23n000010u3dv81zzq1',
    followupDate: '2026-03-10T10:00:00.000Z',
    status: 'PENDING',
    notes: 'Follow up on proposal',
    createdAt: '2026-03-10T05:56:03.164Z',
    lead: {
      id: 'cmmiyhpn20002cvwb4y1o90y7',
      name: 'Tajrian Nice',
      email: 'tajrian@gmail.com',
      phone: '01676566931',
      stage: 'NEW',
      subStatus: null,
    },
    assignedTo: {
      id: 'cmminh23n000010u3dv81zzq1',
      fullName: 'Mahi Chowdhury',
      email: 'mdalraihan450@gmail.com',
    },
  },
  {
    id: 'cmmken6j40000zwu3wxtauf4d',
    leadId: 'cmmhfdt160000vzwb5ai4ej2g',
    assignedToId: 'cmminh23n000010u3dv81zzq1',
    followupDate: '2026-04-20T10:00:00.000Z',
    status: 'PENDING',
    notes: 'Mark as future client - follow up in April',
    createdAt: '2026-03-10T09:25:41.200Z',
    lead: {
      id: 'cmmhfdt160000vzwb5ai4ej2g',
      name: 'Moinul Islam',
      email: 'moinul@email.com',
      phone: '01676566927',
      stage: 'CONTACT_ATTEMPTED',
      subStatus: 'NO_ANSWER',
    },
    assignedTo: {
      id: 'cmminh23n000010u3dv81zzq1',
      fullName: 'Mahi Chowdhury',
      email: 'mdalraihan450@gmail.com',
    },
  },
  {
    id: 'cmmk75l980001ruwb4bm0o7p3',
    leadId: 'cmmiyhpn20003cvwb4y1o90y7',
    assignedToId: 'cmminh23n000010u3dv81zzq1',
    followupDate: '2026-03-15T14:30:00.000Z',
    status: 'PENDING',
    notes: 'Site visit for interior design consultation',
    createdAt: '2026-03-11T08:00:00.000Z',
    lead: {
      id: 'cmmiyhpn20003cvwb4y1o90y7',
      name: 'Sarah Ahmed',
      email: 'sarah.ahmed@company.com',
      phone: '01712345678',
      stage: 'QUALIFIED',
      subStatus: 'WARM_LEAD',
    },
    assignedTo: {
      id: 'cmminh23n000010u3dv81zzq1',
      fullName: 'Mahi Chowdhury',
      email: 'mdalraihan450@gmail.com',
    },
  },
  {
    id: 'cmmk75l980002ruwb4bm0o7p3',
    leadId: 'cmmiyhpn20004cvwb4y1o90y7',
    assignedToId: 'cmminh23n000010u3dv81zzq1',
    followupDate: '2026-03-12T11:00:00.000Z',
    status: 'DONE',
    notes: 'Discussed project requirements and budget',
    createdAt: '2026-03-11T09:15:00.000Z',
    lead: {
      id: 'cmmiyhpn20004cvwb4y1o90y7',
      name: 'Hassan Khan',
      email: 'hassan.khan@business.com',
      phone: '01987654321',
      stage: 'VISIT_SCHEDULED',
      subStatus: null,
    },
    assignedTo: {
      id: 'cmminh23n000010u3dv81zzq1',
      fullName: 'Mahi Chowdhury',
      email: 'mdalraihan450@gmail.com',
    },
  },
  {
    id: 'cmmk75l980003ruwb4bm0o7p3',
    leadId: 'cmmiyhpn20005cvwb4y1o90y7',
    assignedToId: 'cmminh23n000010u3dv81zzq1',
    followupDate: '2026-03-08T09:00:00.000Z',
    status: 'MISSED',
    notes: 'Missed scheduled meeting - need to reschedule',
    createdAt: '2026-03-07T12:00:00.000Z',
    lead: {
      id: 'cmmiyhpn20005cvwb4y1o90y7',
      name: 'Fatima Begum',
      email: 'fatima@residence.com',
      phone: '01555123456',
      stage: 'CONTACT_ATTEMPTED',
      subStatus: 'INTERESTED',
    },
    assignedTo: {
      id: 'cmminh23n000010u3dv81zzq1',
      fullName: 'Mahi Chowdhury',
      email: 'mdalraihan450@gmail.com',
    },
  },
]

const statusConfig: Record<FollowUpStatus, { icon: React.ReactNode; color: string; bgColor: string; label: string }> = {
  PENDING: { 
    icon: <Clock className="w-4 h-4" />, 
    color: 'text-yellow-700 dark:text-yellow-200',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/40',
    label: 'Pending'
  },
  DONE: { 
    icon: <CheckCircle2 className="w-4 h-4" />, 
    color: 'text-green-700 dark:text-green-200',
    bgColor: 'bg-green-100 dark:bg-green-900/40',
    label: 'Done'
  },
  LATELY_DONE: { 
    icon: <CheckCircle2 className="w-4 h-4" />, 
    color: 'text-blue-700 dark:text-blue-200',
    bgColor: 'bg-blue-100 dark:bg-blue-900/40',
    label: 'Lately Done'
  },
  MISSED: { 
    icon: <AlertCircle className="w-4 h-4" />, 
    color: 'text-red-700 dark:text-red-200',
    bgColor: 'bg-red-100 dark:bg-red-900/40',
    label: 'Missed'
  },
}

export default function FollowupsPage() {
  const [followups, setFollowups] = useState<FollowUp[]>(mockFollowups)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('pending')

  useEffect(() => {
    // In production, fetch from API: /api/followup
    // For now, using mock data
  }, [])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const categorizeFollowups = () => {
    const pending = followups.filter((f) => f.status === 'PENDING')
    const overdue = pending.filter((f) => new Date(f.followupDate) < today)
    const todayFollowups = pending.filter((f) => {
      const fDate = new Date(f.followupDate)
      fDate.setHours(0, 0, 0, 0)
      return fDate.getTime() === today.getTime()
    })
    const upcoming = pending.filter((f) => {
      const fDate = new Date(f.followupDate)
      fDate.setHours(0, 0, 0, 0)
      return fDate > today
    })
    const completed = followups.filter((f) => f.status === 'DONE' || f.status === 'LATELY_DONE')
    const missed = followups.filter((f) => f.status === 'MISSED')

    return { pending, overdue, todayFollowups, upcoming, completed, missed }
  }

  const { pending, overdue, todayFollowups, upcoming, completed, missed } = categorizeFollowups()

  const FollowupCard = ({ followup }: { followup: FollowUp }) => {
    const config = statusConfig[followup.status]
    const followupDateTime = new Date(followup.followupDate)
    
    return (
      <Card className="hover:shadow-md transition-shadow duration-200 border-border">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-4">
            {/* Status Icon */}
            <div className={`flex-shrink-0 mt-1 p-2 rounded-lg ${config.bgColor}`}>
              <div className={config.color}>{config.icon}</div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Lead Name and Email */}
              <Link href={`/crm/jr/leads/${followup.leadId}`} className="group">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {followup.lead.name}
                </h3>
              </Link>
              <div className="flex flex-col md:flex-row md:items-center gap-2 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  <span className="truncate">{followup.lead.email}</span>
                </div>
                <div className="hidden md:block">•</div>
                <div className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{followup.lead.phone}</span>
                </div>
              </div>

              {/* Notes */}
              {followup.notes && (
                <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{followup.notes}</p>
              )}

              {/* Meta Info */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {followupDateTime.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })} at {followupDateTime.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <User className="w-3.5 h-3.5" />
                    <span>{followup.assignedTo.fullName}</span>
                  </div>
                </div>
                <Link href={`/crm/jr/leads/${followup.leadId}`}>
                  <Button size="sm" variant="outline" className="gap-1">
                    View <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex-shrink-0">
              <Badge className={`${config.bgColor} ${config.color} text-xs font-medium`}>
                {config.label}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const StatCard = ({ label, count, icon, color }: { label: string; count: number; icon: React.ReactNode; color: string }) => (
    <Card className="bg-card border-border">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold text-foreground mt-2">{count}</p>
          </div>
          <div className={`p-3 rounded-lg ${color}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Followups</h1>
              <p className="text-sm text-muted-foreground mt-1">Track and manage all your followup tasks</p>
            </div>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Followup
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard 
            label="Today" 
            count={todayFollowups.length}
            icon={<Calendar className="w-5 h-5 text-blue-600" />}
            color="bg-blue-50 dark:bg-blue-950"
          />
          <StatCard 
            label="Upcoming" 
            count={upcoming.length}
            icon={<Clock className="w-5 h-5 text-purple-600" />}
            color="bg-purple-50 dark:bg-purple-950"
          />
          <StatCard 
            label="Overdue" 
            count={overdue.length}
            icon={<AlertCircle className="w-5 h-5 text-red-600" />}
            color="bg-red-50 dark:bg-red-950"
          />
          <StatCard 
            label="Completed" 
            count={completed.length}
            icon={<CheckCircle2 className="w-5 h-5 text-green-600" />}
            color="bg-green-50 dark:bg-green-950"
          />
          <StatCard 
            label="Missed" 
            count={missed.length}
            icon={<AlertCircle className="w-5 h-5 text-orange-600" />}
            color="bg-orange-50 dark:bg-orange-950"
          />
          <StatCard 
            label="All Pending" 
            count={pending.length}
            icon={<Clock className="w-5 h-5 text-yellow-600" />}
            color="bg-yellow-50 dark:bg-yellow-950"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="pending" className="gap-2">
              <span className="hidden sm:inline">Pending</span>
              <span className="sm:hidden">P</span>
              <Badge variant="secondary" className="text-xs">{pending.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="today" className="gap-2">
              <span className="hidden sm:inline">Today</span>
              <span className="sm:hidden">T</span>
              <Badge variant="secondary" className="text-xs">{todayFollowups.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="overdue" className="gap-2">
              <span className="hidden sm:inline">Overdue</span>
              <span className="sm:hidden">O</span>
              <Badge variant="secondary" className="text-xs">{overdue.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              <span className="hidden sm:inline">Completed</span>
              <span className="sm:hidden">C</span>
              <Badge variant="secondary" className="text-xs">{completed.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="missed" className="gap-2">
              <span className="hidden sm:inline">Missed</span>
              <span className="sm:hidden">M</span>
              <Badge variant="secondary" className="text-xs">{missed.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* All Pending */}
          <TabsContent value="pending" className="space-y-3">
            {pending.length === 0 ? (
              <Card>
                <CardContent className="pt-12 pb-12 text-center">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground font-medium">No pending followups</p>
                </CardContent>
              </Card>
            ) : (
              pending.map((followup) => <FollowupCard key={followup.id} followup={followup} />)
            )}
          </TabsContent>

          {/* Today */}
          <TabsContent value="today" className="space-y-3">
            {todayFollowups.length === 0 ? (
              <Card>
                <CardContent className="pt-12 pb-12 text-center">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground font-medium">No followups for today</p>
                </CardContent>
              </Card>
            ) : (
              todayFollowups.map((followup) => <FollowupCard key={followup.id} followup={followup} />)
            )}
          </TabsContent>

          {/* Overdue */}
          <TabsContent value="overdue" className="space-y-3">
            {overdue.length === 0 ? (
              <Card>
                <CardContent className="pt-12 pb-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground font-medium">No overdue followups</p>
                </CardContent>
              </Card>
            ) : (
              overdue.map((followup) => <FollowupCard key={followup.id} followup={followup} />)
            )}
          </TabsContent>

          {/* Completed */}
          <TabsContent value="completed" className="space-y-3">
            {completed.length === 0 ? (
              <Card>
                <CardContent className="pt-12 pb-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground font-medium">No completed followups</p>
                </CardContent>
              </Card>
            ) : (
              completed.map((followup) => <FollowupCard key={followup.id} followup={followup} />)
            )}
          </TabsContent>

          {/* Missed */}
          <TabsContent value="missed" className="space-y-3">
            {missed.length === 0 ? (
              <Card>
                <CardContent className="pt-12 pb-12 text-center">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground font-medium">No missed followups</p>
                </CardContent>
              </Card>
            ) : (
              missed.map((followup) => <FollowupCard key={followup.id} followup={followup} />)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
