'use client'

import Link from 'next/link'
import { LayoutDashboard, Zap, FolderKanban, Settings, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function ElectricEngineerDashboardPage() {
  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span className="text-foreground font-medium">Electric Engineer</span>
            <span>/</span>
            <span>Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <LayoutDashboard className="w-7 h-7 text-yellow-500 shrink-0" />
            Electric Engineer Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Overview of electrical engineering workflows, requisitions, and assigned projects.
          </p>
        </div>
        <Badge variant="outline" className="w-fit text-xs">
          Coming Soon
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/electric-engineer/requisition" className="group">
          <Card className="h-full hover:bg-muted/30 transition">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  Electrical Requisition
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </CardTitle>
              <CardDescription>
                Manage and review electrical material requisitions.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/electric-engineer/projects" className="group">
          <Card className="h-full hover:bg-muted/30 transition">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-blue-500" />
                  Projects
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </CardTitle>
              <CardDescription>
                View electrical engineering projects and site status.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/electric-engineer/settings" className="group">
          <Card className="h-full hover:bg-muted/30 transition">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-muted-foreground" />
                  Settings
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </CardTitle>
              <CardDescription>
                Configure Electric Engineer department preferences.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Department Workspace</CardTitle>
          <CardDescription>
            This is a placeholder dashboard for the ELECTRIC_ENGINEER department. Full metrics and workflows will be added soon.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Use the sidebar navigation to switch between Dashboard, Electrical Requisition, Projects, and Settings.
        </CardContent>
      </Card>
    </div>
  )
}
