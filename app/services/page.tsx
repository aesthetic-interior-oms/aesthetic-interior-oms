
import type { Metadata } from "next"
import { PremiumFaqSection } from "@/components/website/faq/premium-faq-section"
import { FaqJsonLd } from "@/components/website/seo/json-ld"
import { interiorDesignFaqs } from "@/lib/seo-faqs"
import { getWebsiteProjects } from "@/lib/website-projects"

import { BreadcrumbJsonLd } from "@/components/website/seo/json-ld";
import { PartnersSection } from "@/components/website/homePage/partners-section";
import { ProcessSection } from "@/components/website/homePage/process-section";
import { ProjectSection } from "@/components/website/homePage/projects-section";
import { ServicesSection } from "@/components/website/homePage/services-section";
import { TestimonialsSection } from "@/components/website/homePage/testimonials-section";
import { TrustFiguresSection } from "@/components/website/homePage/trust-figure-section";
import { CommercialCTA } from "@/components/website/service/commercial/cta";
import { ServiceHero } from "@/components/website/service/service-hero";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Interior Design Services in Dhaka, Bangladesh",
  description:
    "Explore residential, commercial, and architectural interior design services in Dhaka, Bangladesh by Aesthetic Interior Studio, a modern contemporary design brand.",
  keywords: [
    "interior design services Dhaka",
    "interior design services Bangladesh",
    "residential interior design Dhaka",
    "commercial interior design Bangladesh",
    "architectural interior design Dhaka",
  ],
  alternates: {
    canonical: "/services",
  },
  openGraph: {
    title: "Interior Design Services in Dhaka, Bangladesh",
    description:
      "Residential, commercial, and architectural interiors by Aesthetic Interior Studio in Bangladesh.",
    url: "/services",
    type: "website",
  },
}


export default async function ServicePage() {
  const projects = await getWebsiteProjects()
  return (
    <main className="bg-[#f9f7f4]">
      <FaqJsonLd items={interiorDesignFaqs} />
      <BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: "Services", path: "/services" }]} />
    
      <ServiceHero/>
    <ServicesSection/>
      <ProcessSection/>
      <ProjectSection projects={projects}/>
      <PartnersSection/>
      <TrustFiguresSection/>
      <TestimonialsSection/>
      <PremiumFaqSection
        eyebrow="Interior Cost FAQ"
        title="Interior Design Pricing & Company FAQ"
        items={interiorDesignFaqs}
      />
      <CommercialCTA/>
      

    </main>
  )
}
