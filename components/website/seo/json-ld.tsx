import { absoluteUrl, siteName, siteUrl } from "@/lib/site"

type BreadcrumbItem = {
  name: string
  path: string
}

export function LocalBusinessJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "InteriorDesignService"],
    "@id": `${siteUrl}/#localbusiness`,
    name: siteName,
    alternateName: ["Aesthetic Interior", "Aesthetic Interior Studio in BD"],
    description:
      "Aesthetic Interior Studio is a pioneer brand for modern contemporary interior design in Dhaka, Bangladesh.",
    image: [
      absoluteUrl("/Logo/HeaderLogo.png"),
      absoluteUrl("/banner/Banner1.png"),
      absoluteUrl("/banner/Banner9.png"),
    ],
    logo: absoluteUrl("/Logo/HeaderLogo.png"),
    url: siteUrl,
    telephone: "+8801329694663",
    email: "hello@aestheticinteriorbd.com",
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: "183, East Senpara, Begum Rokeya Soroni, Mirpur 10",
      addressLocality: "Dhaka",
      postalCode: "1216",
      addressCountry: "BD",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 23.8041425,
      longitude: 90.3700876,
    },
    hasMap:
      "https://www.google.com/maps/place/AESTHETIC+INTERIOR+STUDIO/@23.8041425,90.3675127,17z/data=!3m1!4b1!4m6!3m5!1s0x3755c1004bf76709:0xe781044b3428d1bc!8m2!3d23.8041425!4d90.3700876!16s%2Fg%2F11w324ds2h",
    areaServed: [
      { "@type": "City", name: "Dhaka" },
      { "@type": "Country", name: "Bangladesh" },
    ],
    knowsAbout: [
      "Modern contemporary interior design",
      "Residential interior design",
      "Commercial interior design",
      "Architectural interior design",
    ],
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
        opens: "09:00",
        closes: "18:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: "10:00",
        closes: "16:00",
      },
    ],
    sameAs: [
      "https://www.facebook.com/aestheticinteriorofficial",
      "https://www.instagram.com/aesthetic.interior.studio",
      "https://www.linkedin.com/company/aesthetic-interior-studio",
      "https://www.youtube.com/@AestheticInteriorofficial",
    ],
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}

export function WebsiteJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: siteName,
    alternateName: ["Aesthetic Interior", "Aesthetic Interior Studio BD"],
    url: siteUrl,
    publisher: {
      "@id": `${siteUrl}/#localbusiness`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/projects?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}

export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: siteName,
    alternateName: ["Aesthetic Interior", "Aesthetic Interior Studio in BD"],
    url: siteUrl,
    logo: absoluteUrl("/Logo/HeaderLogo.png"),
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+8801329694663",
      contactType: "customer service",
      areaServed: "BD",
      availableLanguage: ["English", "Bengali"],
    },
    sameAs: [
      "https://www.facebook.com/aestheticinteriorofficial",
      "https://www.instagram.com/aesthetic.interior.studio",
      "https://www.linkedin.com/company/aesthetic-interior-studio",
      "https://www.youtube.com/@AestheticInteriorofficial",
      "https://www.google.com/maps/place/AESTHETIC+INTERIOR+STUDIO/@23.8041425,90.3675127,17z/data=!3m1!4b1!4m6!3m5!1s0x3755c1004bf76709:0xe781044b3428d1bc!8m2!3d23.8041425!4d90.3700876!16s%2Fg%2F11w324ds2h",
    ],
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}

export function ServiceJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Interior Design",
    provider: {
      "@type": "LocalBusiness",
      name: siteName,
      url: siteUrl,
    },
    areaServed: "Bangladesh",
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Interior Design Services",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Residential Interior Design" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Commercial Interior Design" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Architectural Interior Design" } },
      ],
    },
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}

type FaqJsonLdItem = {
  question: string
  answer: string
}

export function FaqJsonLd({ items }: { items: FaqJsonLdItem[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}
