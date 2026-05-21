import { HomeHeroSection } from "@/components/website/homePage/home-hero-section";
import { ProcessSection } from "@/components/website/homePage/process-section";
import { ServicesSection } from "@/components/website/homePage/services-section";
import { ProjectSection } from "@/components/website/homePage/projects-section";

import { TrustFiguresSection } from "@/components/website/homePage/trust-figure-section";
import { PartnersSection } from "@/components/website/homePage/partners-section";
import { VideoGallerySection } from "@/components/website/homePage/video-gallery-section";
import { AppointmentSection } from "@/components/website/homePage/appointment-section";
import { TestimonialsSection } from "@/components/website/homePage/testimonials-section";
import { CtaSection } from "@/components/website/homePage/cta-section";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background pt-20">
      <HomeHeroSection />
      <ProcessSection />
      <ServicesSection />
      <ProjectSection />
  
      <TrustFiguresSection />
      <PartnersSection />
      <VideoGallerySection />
      <AppointmentSection />
      <TestimonialsSection />
      <CtaSection />
    </main>
  );
}
