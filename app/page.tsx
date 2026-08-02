import type { Metadata } from "next";

import { PremiumFaqSection } from "@/components/website/faq/premium-faq-section";
import {
  FaqJsonLd,
  LocalBusinessJsonLd,
  OrganizationJsonLd,
  ServiceJsonLd,
  WebsiteJsonLd,
} from "@/components/website/seo/json-ld";
import { AppointmentSection } from "@/components/website/homePage/appointment-section";
import { CtaSection } from "@/components/website/homePage/cta-section";
import { HomeHeroSection } from "@/components/website/homePage/home-hero-section";
import { PartnersSection } from "@/components/website/homePage/partners-section";
import { ProcessSection } from "@/components/website/homePage/process-section";
import { ProjectSection } from "@/components/website/homePage/projects-section";
import { ServicesSection } from "@/components/website/homePage/services-section";
import { TestimonialsSection } from "@/components/website/homePage/testimonials-section";
import { TrustFiguresSection } from "@/components/website/homePage/trust-figure-section";
import { VideoGallerySection } from "@/components/website/homePage/video-gallery-section";
import { interiorDesignFaqs } from "@/lib/seo-faqs";
import { getWebsiteProjects } from "@/lib/website-projects";
import { siteName } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${siteName} in BD | Modern Interior Design Studio in Dhaka`,
  description:
    "Aesthetic Interior Studio in BD is a pioneer brand for modern contemporary interior design in Dhaka, Bangladesh. Explore residential, commercial, and architectural interiors.",
  keywords: [
    "aesthetic interior studio in bd",
    "aesthetic interior studio Dhaka",
    "aesthetic interior Bangladesh",
    "interior design Dhaka Bangladesh",
    "modern contemporary interior design Bangladesh",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `${siteName} in BD | Modern Interior Design Studio in Dhaka`,
    description:
      "Aesthetic Interior Studio is a pioneer brand for modern contemporary interior design in Dhaka, Bangladesh.",
    url: "/",
    type: "website",
  },
};

export default async function HomePage() {
  const projects = await getWebsiteProjects()
  return (
    <main className="min-h-screen bg-background pt-20">
      <WebsiteJsonLd />
      <OrganizationJsonLd />
      <LocalBusinessJsonLd />
      <ServiceJsonLd />
      <FaqJsonLd items={interiorDesignFaqs} />
      <HomeHeroSection />
      <ProcessSection />
      <ServicesSection />
      <ProjectSection projects={projects} />
      <TrustFiguresSection />
      <PartnersSection />
      <VideoGallerySection />
      <AppointmentSection />
      <PremiumFaqSection items={interiorDesignFaqs} />
      <TestimonialsSection />
      <CtaSection />
    </main>
  );
}
