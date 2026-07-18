import type { Metadata } from 'next'
import { PremiumFaqSection } from "@/components/website/faq/premium-faq-section"
import { FaqJsonLd } from "@/components/website/seo/json-ld"
import { interiorDesignFaqs } from "@/lib/seo-faqs"


import { BreadcrumbJsonLd } from '@/components/website/seo/json-ld'
import { CommercialHero } from '@/components/website/service/commercial/commercialHero'
import { CommercialPortfolio } from '@/components/website/service/commercial/commercialPortfolio'
import { CommercialFeaturedProject } from '@/components/website/service/commercial/featured-project'
import { CommercialProcess } from '@/components/website/service/commercial/commercialProcess'
import { CommercialCTA } from '@/components/website/service/commercial/cta'

export const metadata: Metadata = {
  title: 'Commercial Interior Design in Dhaka, Bangladesh',
  description:
    'Commercial and office interior design in Dhaka, Bangladesh for productive, brand-aligned workplaces, retail spaces, and business interiors.',
  keywords: [
    'commercial interior design Dhaka',
    'office interior design Bangladesh',
    'retail interior design Dhaka',
    'workplace interior design Bangladesh',
  ],
  alternates: {
    canonical: '/services/commercial',
  },
  openGraph: {
    title: 'Commercial Interior Design in Dhaka, Bangladesh',
    description:
      'Office, retail, and commercial interior solutions by Aesthetic Interior Studio in Bangladesh.',
    url: '/services/commercial',
    type: 'website',
  },
}


export default function CommercialServicePage() {
  return (
    <main className="bg-[#f9f7f4]">
      <FaqJsonLd items={interiorDesignFaqs} />
      <BreadcrumbJsonLd items={[{ name: 'Home', path: '/' }, { name: 'Services', path: '/services' }, { name: 'Commercial', path: '/services/commercial' }]} />
      
      {/* 1. Hero Section */}
      <CommercialHero />
      
      {/* 2. Portfolio Section */}
      <CommercialPortfolio />
      
      {/* 3. Featured Project Section */}
      <CommercialFeaturedProject />
      
      {/* 4. Our Process (Commercial) */}
      <CommercialProcess />
      
      {/* 5. CTA Section */}
      <PremiumFaqSection
        eyebrow="Interior Cost FAQ"
        title="Interior Design Pricing & Company FAQ"
        items={interiorDesignFaqs}
      />
      <CommercialCTA />
      
   
    </main>
  )
}
