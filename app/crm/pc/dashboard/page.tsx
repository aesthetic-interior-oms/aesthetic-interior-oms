'use client'

import { useEffect, useState } from 'react'
import { CrmPageHeader } from '@/components/crm/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClipboardList, FolderOpen, Loader2 } from 'lucide-react'
import Link from 'next/link'

type DashboardStats = {
  totalProjects: number
  activeProjects: number
}

export default function PCDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/pc/projects?stats=true', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { success: boolean; stats?: DashboardStats }) => {
        if (data.success && data.stats) {
          setStats(data.stats)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col min-h-screen">
      <CrmPageHeader
        title="Project Coordinator Dashboard"
        subtitle="Overview of your assigned projects."
      />
      <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8 w-full flex-1">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Projects
                </CardTitle>
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.totalProjects ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  All assigned projects
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Projects
                </CardTitle>
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.activeProjects ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Currently in progress
                </p>
              </CardContent>
            </Card>
          </div>
        )}
        <div className="mt-4">
          <Link
            href="/crm/pc/projects"
            className="text-sm text-primary hover:underline font-medium"
          >
            View all projects →
          </Link>
        </div>
      </div>
    </div>
  )
}
