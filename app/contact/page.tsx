import type { Metadata } from "next"
import { ContactForm } from "@/components/website/contact/contact-form"
import { ContactInfo } from "@/components/website/contact/contact-info"
import { BreadcrumbJsonLd } from "@/components/website/seo/json-ld"

export const metadata: Metadata = {
  title: "Contact Aesthetic Interior Studio | Interior Designer in Dhaka",
  description:
    "Contact Aesthetic Interior Studio in Mirpur, Dhaka for residential, commercial, and architectural interior design consultations in Bangladesh.",
  keywords: [
    "contact interior designer Dhaka",
    "Aesthetic Interior Studio contact",
    "interior design consultation Bangladesh",
    "interior studio Mirpur Dhaka",
  ],
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact Aesthetic Interior Studio | Dhaka, Bangladesh",
    description:
      "Book an interior design consultation with Aesthetic Interior Studio in Dhaka, Bangladesh.",
    url: "/contact",
    type: "website",
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
