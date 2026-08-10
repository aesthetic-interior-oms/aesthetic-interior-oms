import type { Metadata } from 'next'

import { PremiumFaqSection } from '@/components/website/faq/premium-faq-section'
import { BreadcrumbJsonLd, FaqJsonLd } from '@/components/website/seo/json-ld'
import { ArchitecturalHero } from '@/components/website/service/architectural/hero'
import { ArchitecturalPortfolio } from '@/components/website/service/architectural/portfolio'
import { FeaturedProject } from '@/components/website/service/architectural/featured-project'
import { ServiceOverview } from '@/components/website/service/architectural/service-overview'
import { DesignTypes } from '@/components/website/service/architectural/design-type'
import { Process } from '@/components/website/service/architectural/process'
import { CTA } from '@/components/website/service/architectural/cta'
import { interiorDesignFaqs } from '@/lib/seo-faqs'

export const metadata: Metadata = {
  title: 'Architectural Interior Design in Dhaka, Bangladesh',
  description:
    'Architectural interior design services in Dhaka, Bangladesh with space planning, working drawings, detailing, and execution support.',
  keywords: [
    'architectural interior design Dhaka',
    'space planning Bangladesh',
    'interior working drawing Dhaka',
    'architectural design support Bangladesh',
  ],
  alternates: {
    canonical: '/services/architectural',
  },
  openGraph: {
    title: 'Architectural Interior Design in Dhaka, Bangladesh',
    description:
      'Planning, detailing, and architectural interior support by Aesthetic Interior Studio in Bangladesh.',
    url: '/services/architectural',
    type: 'website',
  },
}

export default function ArchitecturalServicePage() {
  const showWorkingState = true

  if (showWorkingState) {
    return (
      <main className="bg-[#f9f7f4] pt-20">
        <FaqJsonLd items={interiorDesignFaqs} />
        <BreadcrumbJsonLd items={[{ name: 'Home', path: '/' }, { name: 'Services', path: '/services' }, { name: 'Architectural', path: '/services/architectural' }]} />
        <section className="flex min-h-[50vh] items-center justify-center px-6 text-center">
          <div>
            <p className="mb-3 text-sm uppercase tracking-[0.2em] text-[#a57c00]">Architectural Service</p>
            <h1 className="font-serif text-3xl text-[#0d3d3d] md:text-5xl">Working on this page</h1>
          </div>
        </section>
        <PremiumFaqSection
          eyebrow="Interior Cost FAQ"
          title="Planning an Architectural Interior Project?"
          items={interiorDesignFaqs}
        />
      </main>
    )
  }

  return (
    <main className="bg-[#f9f7f4]">
      <FaqJsonLd items={interiorDesignFaqs} />
      <BreadcrumbJsonLd items={[{ name: 'Home', path: '/' }, { name: 'Services', path: '/services' }, { name: 'Architectural', path: '/services/architectural' }]} />

      {/* 1. Hero Section */}
      <ArchitecturalHero/>

      {/* 2. Portfolio Section */}
      <ArchitecturalPortfolio/>

      {/* 3. Featured Project Section */}
      <FeaturedProject />

      {/* 4. Architectural Service Overview */}
      <ServiceOverview />

      {/* 5. Types of Architect Design */}
      <DesignTypes />

      {/* 6. Our Process (Interior) */}
      <Process />

      {/* 7. CTA Section */}
      <PremiumFaqSection
        eyebrow="Interior Cost FAQ"
        title="Planning an Architectural Interior Project?"
        items={interiorDesignFaqs}
      />
      <CTA />
    </main>
  )
}
