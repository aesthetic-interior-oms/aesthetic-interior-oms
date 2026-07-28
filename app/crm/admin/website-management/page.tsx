import { WebsiteProjectManager } from '@/components/settings/website-project-manager'
import { WebsiteTeamManager } from '@/components/settings/website-team-manager'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function WebsiteManagementPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <h1 className="text-3xl font-bold text-foreground">Website Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the public website showcase projects and About page team members.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="team">Our Team</TabsTrigger>
          </TabsList>
          <TabsContent value="projects"><WebsiteProjectManager /></TabsContent>
          <TabsContent value="team"><WebsiteTeamManager /></TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
