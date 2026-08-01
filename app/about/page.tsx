import type { Metadata } from "next"

import { AboutCTA } from "@/components/website/about/about-cta"
import { AboutHero } from "@/components/website/about/about-hero"
import { CeoVision } from "@/components/website/about/ceo-vision"
import { OurPhilosophy } from "@/components/website/about/our-philosophy"
import { OurStory } from "@/components/website/about/our-story"
import { OurTeam } from "@/components/website/about/our-team"
import { WhatWeDo } from "@/components/website/about/what-we-do"
import { BreadcrumbJsonLd } from "@/components/website/seo/json-ld"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "About Aesthetic Interior Studio | Interior Design Company in Dhaka",
  description:
    "Learn about Aesthetic Interior Studio, a pioneer modern contemporary interior design brand in Dhaka, Bangladesh for homes, offices, and architectural spaces.",
  keywords: [
    "about Aesthetic Interior Studio",
    "interior design company Dhaka",
    "interior design firm Bangladesh",
    "modern contemporary interior design company",
  ],
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About Aesthetic Interior Studio | Dhaka Interior Design Company",
    description:
      "Meet the Dhaka-based team behind Aesthetic Interior Studio and our modern contemporary approach to interiors.",
    url: "/about",
    type: "website",
  },
}

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
