import type { Metadata } from "next"
import { PremiumFaqSection } from "@/components/website/faq/premium-faq-section"
import { FaqJsonLd } from "@/components/website/seo/json-ld"
import { interiorDesignFaqs } from "@/lib/seo-faqs"
import { ResedentialHero } from "@/components/website/service/residential-projects/resedential-hero";
import { ResidentialPortfolio } from "@/components/website/service/residential-projects/resedential-portfolio";
import { TrustSection } from "@/components/website/service/residential-projects/trust-section";
import { BreadcrumbJsonLd } from "@/components/website/seo/json-ld";

export const metadata: Metadata = {
    title: "Residential Interior Design in Dhaka, Bangladesh",
    description:
        "Premium residential interior design in Dhaka, Bangladesh for apartments, duplex homes, living rooms, bedrooms, kitchens, and complete home makeovers.",
    keywords: [
        "residential interior design Dhaka",
        "home interior design Bangladesh",
        "apartment interior design Dhaka",
        "Aesthetic Interior Studio residential",
    ],
    alternates: {
        canonical: "/services/residential",
    },
    openGraph: {
        title: "Residential Interior Design in Dhaka, Bangladesh",
        description:
            "Modern contemporary home interiors by Aesthetic Interior Studio for apartments and houses in Bangladesh.",
        url: "/services/residential",
        type: "website",
    },
}

export default function ResidentialPage() {
    return(
        <main className="bg-[#f9f7f4]">
            <FaqJsonLd items={interiorDesignFaqs} />
      <BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: "Services", path: "/services" }, { name: "Residential", path: "/services/residential" }]} />
            <ResedentialHero/>
            <ResidentialPortfolio/>
            <PremiumFaqSection
        eyebrow="Interior Cost FAQ"
        title="Interior Design Pricing & Company FAQ"
        items={interiorDesignFaqs}
      />
      <TrustSection/>
          
            
        </main>
    )
}
