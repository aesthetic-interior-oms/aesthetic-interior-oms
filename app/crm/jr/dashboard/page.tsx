import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, CheckCircle, Calendar, TrendingUp } from 'lucide-react'

const dashboardCards = [
  {
    title: 'Total Leads',
    value: '48',
    icon: Users,
    color: 'bg-blue-500',
  },
  {
    title: 'Today Followups',
    value: '12',
    icon: CheckCircle,
    color: 'bg-green-500',
  },
  {
    title: 'Today Visits',
    value: '5',
    icon: Calendar,
    color: 'bg-purple-500',
  },
  {
    title: 'Conversion Rate',
    value: '18%',
    icon: TrendingUp,
    color: 'bg-orange-500',
  },
]

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">Welcome back! Here's your CRM overview.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <div className={`${card.color} p-2 rounded-lg`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { action: 'Lead Created', description: 'Acme Corp - New Lead', time: '2 hours ago' },
              { action: 'Status Updated', description: 'Lead moved to Contacted', time: '4 hours ago' },
              { action: 'Visit Scheduled', description: 'Site visit scheduled', time: '1 day ago' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-4 pb-4 border-b last:border-b-0">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{item.action}</p>
                  <p className="text-sm text-slate-600">{item.description}</p>
                </div>
                <p className="text-xs text-slate-500">{item.time}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
