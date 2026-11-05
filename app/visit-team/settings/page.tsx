'use client'

import { useEffect, useState } from 'react'
import {
  BarChart3,
  Loader2,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react'

import { CrmPageHeader } from '@/components/crm/shared/page-header'
import { VisitPerformanceSettings } from '@/components/settings/visit-performance-settings'
import { VisitWorkflowSettings } from '@/components/settings/visit-workflow-settings'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { hasVisitTeamLeadershipRole } from '@/lib/visit-team-roles'

export default function VisitDepartmentSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [activeTab, setActiveTab] = useState('performance')

  useEffect(() => {
    fetch('/api/me')
      .then(async (res) => {
        if (!res.ok) return
        const me = (await res.json()) as {
          userDepartments?: Array<{ department?: { name?: string | null } | null }>
          userRoles?: Array<{ role?: { name?: string | null } | null }>
        }
        const userDepartments = Array.isArray(me?.userDepartments)
          ? me.userDepartments
              .map((d) => d?.department?.name)
              .filter((name): name is string => Boolean(name))
          : []
        const userRoles = Array.isArray(me?.userRoles)
          ? me.userRoles
              .map((r) => r?.role?.name)
              .filter((name): name is string => Boolean(name))
          : []

        const isAdmin = userDepartments.includes('ADMIN')
        const isVisitDept =
          userDepartments.includes('VISIT_TEAM') ||
          userDepartments.includes('SPECIALIST_DESIGN_CONSULTANTS')
        const isLeader = (isVisitDept || isAdmin) && hasVisitTeamLeadershipRole(userRoles)

        setHasAccess(isAdmin || isLeader)
      })
      .catch(() => setHasAccess(false))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <CrmPageHeader
          title="Visit Department Settings"
          subtitle="Manage visit department performance marks and workflow policies."
        />
        <main className="mx-auto max-w-[1440px] px-4 py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </main>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background">
        <CrmPageHeader
          title="Visit Department Settings"
          subtitle="Manage visit department performance marks and workflow policies."
        />
        <main className="mx-auto max-w-[1440px] px-4 py-8">
          <Card className="border-destructive/30 bg-destructive/5 max-w-xl mx-auto">
            <CardContent className="flex items-center gap-4 py-6">
              <ShieldAlert className="h-8 w-8 text-destructive shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground">Access Restricted</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Only Visit Department Leaders and Admins have permission to manage department settings and scores.
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <CrmPageHeader
        title="Visit Department Settings"
        subtitle="Manage monthly attendance, behaviour evaluation marks, and visit team workflow policies."
      />
      <main className="mx-auto max-w-[1440px] px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/80 p-1 border">
            <TabsTrigger value="performance" className="gap-2 font-medium">
              <BarChart3 className="size-4 text-teal-600" />
              Performance & Scoring
            </TabsTrigger>
            <TabsTrigger value="workflow" className="gap-2 font-medium">
              <SlidersHorizontal className="size-4 text-teal-600" />
              Workflow Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-6">
            <VisitPerformanceSettings />
          </TabsContent>

          <TabsContent value="workflow" className="space-y-6">
            <VisitWorkflowSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
