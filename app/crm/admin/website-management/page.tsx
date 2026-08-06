import { ImageIcon, MessageSquareQuote, UsersRound, Video } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WebsiteProjectManager } from '@/components/settings/website-project-manager'
import { WebsiteTeamManager } from '@/components/settings/website-team-manager'
import { WebsiteVideoManager } from '@/components/settings/website-video-manager'
import { WebsiteTestimonialManager } from '@/components/settings/website-testimonial-manager'

export default function WebsiteManagementPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-[#17382d] sm:text-3xl">Website Management</h1>
          <p className="mt-2 text-sm text-slate-600">Add content, publish it, and drag items in the list to control website order.</p>
        </div>

        <Tabs defaultValue="team" className="space-y-5">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl border bg-white p-2 shadow-sm md:grid-cols-4">
            <TabsTrigger value="team" className="h-11 rounded-xl data-[state=active]:bg-[#17382d] data-[state=active]:text-white">
              <UsersRound className="mr-2 h-4 w-4" /> Team
            </TabsTrigger>
            <TabsTrigger value="videos" className="h-11 rounded-xl data-[state=active]:bg-[#17382d] data-[state=active]:text-white">
              <Video className="mr-2 h-4 w-4" /> Videos
            </TabsTrigger>
            <TabsTrigger value="testimonials" className="h-11 rounded-xl data-[state=active]:bg-[#17382d] data-[state=active]:text-white">
              <MessageSquareQuote className="mr-2 h-4 w-4" /> Testimonials
            </TabsTrigger>
            <TabsTrigger value="projects" className="h-11 rounded-xl data-[state=active]:bg-[#17382d] data-[state=active]:text-white">
              <ImageIcon className="mr-2 h-4 w-4" /> Projects
            </TabsTrigger>
          </TabsList>

          <TabsContent value="team" className="mt-0">
            <WebsiteTeamManager />
          </TabsContent>
          <TabsContent value="videos" className="mt-0">
            <WebsiteVideoManager />
          </TabsContent>
          <TabsContent value="testimonials" className="mt-0">
            <WebsiteTestimonialManager />
          </TabsContent>
          <TabsContent value="projects" className="mt-0">
            <WebsiteProjectManager />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
