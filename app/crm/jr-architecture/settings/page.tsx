'use client'

import { useEffect, useState } from 'react'
import { CrmPageHeader } from '@/components/crm/shared/page-header'
import { JrArchitectWorkflowSettings } from '@/components/settings/jr-architect-workflow-settings'
import { fetchMeCached } from '@/lib/client-me'
import { hasJrArchitectureLeadershipRole } from '@/lib/jr-architecture-roles'
import { Card, CardContent } from '@/components/ui/card'
import { ShieldAlert, Loader2 } from 'lucide-react'

export default function JrArchitectSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

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
        const isLeader =
          (userDepartments.includes('JR_ARCHITECT') || isAdmin) &&
          hasJrArchitectureLeadershipRole(userRoles)

        setHasAccess(isAdmin || isLeader)
      })
      .catch(() => setHasAccess(false))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <CrmPageHeader
          title="JR Architect Settings"
          subtitle="Manage department resubmission and upload policies."
        />
        <main className="mx-auto max-w-[1440px] px-4 py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background">
        <CrmPageHeader
          title="JR Architect Settings"
          subtitle="Manage department resubmission and upload policies."
        />
        <main className="mx-auto max-w-[1440px] px-4 py-8">
          <Card className="border-destructive/30 bg-destructive/5 max-w-xl mx-auto">
            <CardContent className="flex items-center gap-4 py-6">
              <ShieldAlert className="h-8 w-8 text-destructive shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground">Access Restricted</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Only JR Architect Leaders and Admins have permission to manage department settings.
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
        title="JR Architect Settings"
        subtitle="Manage department-wide file resubmission policies and stage permissions."
      />
      <main className="mx-auto max-w-[1440px] px-4 py-8">
        <JrArchitectWorkflowSettings />
      </main>
    </div>
  )
}
