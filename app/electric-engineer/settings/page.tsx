'use client'

import Link from 'next/link'
import { Settings } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function ElectricEngineerSettingsPage() {
  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/electric-engineer/dashboard" className="hover:text-foreground">
              Electric Engineer
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Settings</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Settings className="w-7 h-7 text-muted-foreground shrink-0" />
            Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Preferences and configuration for the Electric Engineer portal.
          </p>
        </div>
        <Badge variant="outline" className="w-fit text-xs">
          Coming Soon
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Department Settings</CardTitle>
          <CardDescription>
            Placeholder page for ELECTRIC_ENGINEER settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Notification preferences and department configuration options will be added here.
        </CardContent>
      </Card>
    </div>
  )
}
