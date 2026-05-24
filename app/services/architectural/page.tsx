import type { Metadata } from 'next'

import { BreadcrumbJsonLd } from '@/components/seo/json-ld'
import { ArchitecturalHero } from '@/components/website/service/architectural/hero'
import { ArchitecturalPortfolio } from '@/components/website/service/architectural/portfolio'
import { FeaturedProject } from '@/components/website/service/architectural/featured-project'
import { ServiceOverview } from '@/components/website/service/architectural/service-overview'
import { DesignTypes } from '@/components/website/service/architectural/design-type'
import { Process } from '@/components/website/service/architectural/process'
import { CTA } from '@/components/website/service/architectural/cta'

export const metadata: Metadata = {
  title: 'Architectural Interior Design in Bangladesh',
  description: 'Architectural interior design services in Bangladesh with planning, detailing, and execution support.',
  alternates: {
    canonical: '/services/architectural',
  },
}


export default function CommercialServicePage() {
  const showWorkingState = true

  if (showWorkingState) {
    return (
      <main className="bg-[#f9f7f4] min-h-screen flex items-center justify-center">
        <BreadcrumbJsonLd items={[{ name: 'Home', path: '/' }, { name: 'Services', path: '/services' }, { name: 'Architectural', path: '/services/architectural' }]} />
        <div className="text-center px-6">
          <p className="text-sm tracking-[0.2em] uppercase text-[#a57c00] mb-3">Architectural Service</p>
          <h1 className="text-3xl md:text-5xl font-serif text-[#0d3d3d]">Working on this page</h1>
        </div>
      </main>
    )
  }

  return (
    <main className="bg-[#f9f7f4]">
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
      <CTA />
      

    </main>
  )
}
