import { Globe2, ImageIcon, MessageSquareQuote, Sparkles, UsersRound, Video } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WebsiteProjectManager } from '@/components/settings/website-project-manager'
import { WebsiteTeamManager } from '@/components/settings/website-team-manager'
import { WebsiteVideoManager } from '@/components/settings/website-video-manager'
import { WebsiteTestimonialManager } from '@/components/settings/website-testimonial-manager'

const workflowCards = [
  {
    title: 'About page team',
    description: 'Add experts, upload profile photos, set sort order, and publish only approved members.',
    icon: UsersRound,
  },
  {
    title: 'Project showcase',
    description: 'Create portfolio projects with gallery images, thumbnails, categories, and page slugs.',
    icon: ImageIcon,
  },
  {
    title: 'Visual stories',
    description: 'Add YouTube Shorts, Facebook, and Instagram videos for the home page video gallery.',
    icon: Video,
  },
  {
    title: 'Live website control',
    description: 'Published changes feed the public website while drafts stay hidden from visitors.',
    icon: Globe2,
  },
]

export default function WebsiteManagementPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(165,124,0,0.12),transparent_32rem),linear-gradient(180deg,#fffdf8_0%,#f8fafc_44%,#f3f4f6_100%)]">
      <section className="border-b border-[#e7dfcf] bg-white/85 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
            <div className="space-y-5">
              <Badge className="w-fit border-[#d7b55f]/40 bg-[#fff8e5] px-3 py-1 text-[#8a6500] hover:bg-[#fff8e5]">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Website content studio
              </Badge>
              <div className="max-w-3xl space-y-3">
                <h1 className="text-3xl font-bold tracking-tight text-[#17382d] sm:text-4xl lg:text-5xl">
                  Manage public website content with confidence
                </h1>
                <p className="text-base leading-7 text-slate-600 sm:text-lg">
                  Update the About page team, portfolio showcase, home videos, and testimonials from one clean workspace. Upload images,
                  review draft status, edit details, and publish only when the content is ready.
                </p>
              </div>
            </div>

            <Card className="overflow-hidden border-[#eadfca] bg-[#17382d] text-white shadow-xl shadow-[#17382d]/10">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white/10 p-3">
                    <Globe2 className="h-6 w-6 text-[#f3cf70]" />
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.18em] text-[#f3cf70]">Admin workflow</p>
                    <h2 className="text-xl font-semibold">Create → Preview → Publish</h2>
                  </div>
                </div>
                <p className="text-sm leading-6 text-white/75">
                  Keep team members and projects organized without touching code. Draft items remain private until the
                  publish switch is enabled.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {workflowCards.map(({ title, description, icon: Icon }) => (
              <Card key={title} className="border-[#eadfca] bg-white/80 shadow-sm">
                <CardContent className="flex gap-4 p-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f7edcf] text-[#9a7100]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#17382d]">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Tabs defaultValue="team" className="space-y-6">
          <div className="flex flex-col gap-4 rounded-3xl border border-[#eadfca] bg-white/80 p-3 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <TabsList className="grid h-auto w-full grid-cols-4 rounded-2xl bg-slate-100 p-1 sm:w-auto">
              <TabsTrigger value="team" className="rounded-xl px-5 py-2.5 data-[state=active]:bg-white data-[state=active]:text-[#17382d]">
                <UsersRound className="mr-2 h-4 w-4" /> Team members
              </TabsTrigger>
              <TabsTrigger value="videos" className="rounded-xl px-5 py-2.5 data-[state=active]:bg-white data-[state=active]:text-[#17382d]">
                <Video className="mr-2 h-4 w-4" /> Videos
              </TabsTrigger>
              <TabsTrigger value="testimonials" className="rounded-xl px-5 py-2.5 data-[state=active]:bg-white data-[state=active]:text-[#17382d]">
                <MessageSquareQuote className="mr-2 h-4 w-4" /> Testimonials
              </TabsTrigger>
              <TabsTrigger value="projects" className="rounded-xl px-5 py-2.5 data-[state=active]:bg-white data-[state=active]:text-[#17382d]">
                <ImageIcon className="mr-2 h-4 w-4" /> Projects
              </TabsTrigger>
            </TabsList>
            <p className="px-2 text-sm text-slate-500">
              Tip: use sort order to control display sequence on the public website.
            </p>
          </div>

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
