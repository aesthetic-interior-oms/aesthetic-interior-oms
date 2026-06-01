
import type { Metadata } from "next"

import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { PartnersSection } from "@/components/website/homePage/partners-section";
import { ProcessSection } from "@/components/website/homePage/process-section";
import { ProjectSection } from "@/components/website/homePage/projects-section";
import { ServicesSection } from "@/components/website/homePage/services-section";
import { TestimonialsSection } from "@/components/website/homePage/testimonials-section";
import { TrustFiguresSection } from "@/components/website/homePage/trust-figure-section";
import { CommercialCTA } from "@/components/website/service/commercial/cta";
import { ServiceHero } from "@/components/website/service/service-hero";

export const metadata: Metadata = {
  title: "Interior Design Services in Bangladesh",
  description:
    "Explore residential, commercial, and architectural interior design services in Bangladesh by Aesthetic Interior Studio.",
  alternates: {
    canonical: "/services",
  },
}


export default function ServicePage() {
  return (
    <main className="bg-[#f9f7f4]">
      <BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: "Services", path: "/services" }]} />
    
      <ServiceHero/>
    <ServicesSection/>
      <ProcessSection/>
      <ProjectSection/>
      <PartnersSection/>
      <TrustFiguresSection/>
      <TestimonialsSection/>
      <CommercialCTA/>
      

    </main>
  )
}
