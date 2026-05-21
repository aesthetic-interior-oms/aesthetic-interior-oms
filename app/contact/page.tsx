import type { Metadata } from "next"
import { ContactHero } from "@/components/website/contact/contact-hero"
import { ContactForm } from "@/components/website/contact/contact-form"
import { ContactInfo } from "@/components/website/contact/contact-info"
import { BreadcrumbJsonLd } from "@/components/seo/json-ld"

export const metadata: Metadata = {
  title: "Contact Us | Aesthetic Interior Studio",
  description: "Get in touch with our design team. We're here to bring your interior design vision to life.",
  alternates: {
    canonical: "/contact",
  },
}

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-background">
      <BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: "Contact", path: "/contact" }]} />

      {/* <ContactHero /> */}
      <div className="pt-16 lg:pt-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-start">
            <ContactForm />
            <ContactInfo />
          </div>
        </div>
      </div>
    </main>
  )
}
