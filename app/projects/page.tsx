import type { Metadata } from "next"

import { ProjectCTA } from "@/components/website/projects/project-cta"
import { ProjectGallery } from "@/components/website/projects/project-gallery"
import { BreadcrumbJsonLd } from "@/components/website/seo/json-ld"
import { getWebsiteProjects } from "@/lib/website-projects"

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Interior Design Projects in Dhaka, Bangladesh",
  description:
    "Explore Aesthetic Interior Studio's residential, commercial, and architectural interior design projects in Dhaka and across Bangladesh.",
  keywords: [
    "interior design projects Dhaka",
    "interior portfolio Bangladesh",
    "Aesthetic Interior Studio projects",
    "residential commercial interior design portfolio",
  ],
  alternates: {
    canonical: "/projects",
  },
  openGraph: {
    title: "Interior Design Projects in Dhaka, Bangladesh",
    description:
      "See modern contemporary interior design projects by Aesthetic Interior Studio in Bangladesh.",
    url: "/projects",
    type: "website",
  },
}

export default async function ProjectsPage() {
  const projects = await getWebsiteProjects()
  return (
    <main className="min-h-screen bg-background pt-20">
      <BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: "Projects", path: "/projects" }]} />
      <section className="bg-[#0d3d3d] py-20 md:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
          <p className="text-[#d8b251] text-sm uppercase tracking-widest mb-3 font-medium">Our Portfolio</p>
          <h1 className="text-4xl md:text-5xl font-serif text-white">Designs We&apos;re Proud Of</h1>
          <p className="text-white/75 mt-4 max-w-2xl mx-auto">
            Explore a collection of our dream projects. Every space tells a story of thoughtful design and meticulous
            craftsmanship.
          </p>
        </div>
      </section>
      <ProjectGallery projects={projects} />
      <ProjectCTA />
    </main>
  )
}
