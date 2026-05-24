import { AboutHero } from "@/components/website/about/about-hero"
import { OurPhilosophy } from "@/components/website/about/our-philosophy"
import { OurStory } from "@/components/website/about/our-story"
import { WhatWeDo } from "@/components/website/about/what-we-do"
import { OurTeam } from "@/components/website/about/our-team"
import { CeoVision } from "@/components/website/about/ceo-vision"
import { AboutCTA } from "@/components/website/about/about-cta"
import { BreadcrumbJsonLd } from "@/components/seo/json-ld"

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#faf9f6]">
      <BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: "About", path: "/about" }]} />
      <AboutHero />
      <CeoVision />
      <OurPhilosophy />
      <OurStory />
      <WhatWeDo />
      <OurTeam />
      <AboutCTA />
    </main>
  )
}
