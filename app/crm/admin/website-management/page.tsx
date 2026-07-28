import { WebsiteProjectManager } from '@/components/settings/website-project-manager'
import { WebsiteTeamManager } from '@/components/settings/website-team-manager'

export default function WebsiteManagementPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="border-b border-border bg-card sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold text-foreground">Website Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the project showcase and About page team members shown on the public website.
          </p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto space-y-8 px-6 py-8">
        <WebsiteTeamManager />
        <WebsiteProjectManager />
      </div>
    </main>
  )
}
